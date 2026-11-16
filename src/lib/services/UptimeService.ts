import { container } from '@sapphire/framework';
import { BotUptime, type IBotUptime } from '../../models/BotUptime';

/**
 * Bot uptime tracking, persisted in MongoDB so it survives restarts and can
 * be aggregated across windows by the public `/api/health` endpoint.
 *
 * Design notes:
 * - A "session" is one gateway connection lifetime. `clientReady` (once)
 *   opens the interval; `shardDisconnect` pauses heartbeats (the interval
 *   stays open so a reconnect doesn't fragment history), and
 *   `shardResume`/`shardReady` resumes them.
 * - `heartbeat()` runs every 60 s while connected. `lastHeartbeatAt` is the
 *   source of truth for "was the bot alive at time T": a crashed or
 *   partitioned process leaves an open interval whose heartbeat simply
 *   stops, so downtime is computed as the gap between the last heartbeat
 *   (+ grace) and the next interval's `startedAt` — `endedAt` alone would
 *   miss ungraceful deaths entirely.
 * - `uptimePercent(window)` = covered time / window time, measured against
 *   the window edges so a bot older than the window still reports ~100 %.
 */
const HEARTBEAT_MS = 60_000;
/** Heartbeats older than this on an open interval are treated as dead. */
const STALE_HEARTBEAT_MS = 3 * HEARTBEAT_MS;
/** Retention: keep raw intervals for 90 days, then let Mongo prune them. */
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

interface UptimeClient {
	uptime: number | null;
}

let current: IBotUptime | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let connected = false;

function log(...args: unknown[]) {
	try {
		container.logger.info('[UptimeService]', ...args);
	} catch {
		// logger may not be ready during early boot
	}
}

export const UptimeService = {
	/** Idempotent — safe to call from ready.ts and tests. */
	async start(client: UptimeClient): Promise<void> {
		if (connected) return;
		connected = true;

		try {
			// Close any orphaned open interval from a previous ungraceful death.
			const orphan = await BotUptime.findOne({ endedAt: null }).sort({ startedAt: -1 });
			if (orphan) {
				orphan.endedAt = orphan.lastHeartbeatAt ?? orphan.startedAt;
				orphan.reason = 'replaced';
				await orphan.save();
			}

			current = await BotUptime.create({
				startedAt: new Date(),
				endedAt: null,
				reason: 'ready',
				lastHeartbeatAt: new Date(),
				clientUptimeMs: client.uptime ?? 0
			});

			this._armHeartbeat(client);
			log(`interval opened (${String(current._id)})`);
		} catch (error) {
			container.logger.warn('[UptimeService] failed to open uptime interval:', error);
		}
	},

	_armHeartbeat(client: UptimeClient): void {
		if (heartbeatTimer) clearInterval(heartbeatTimer);
		heartbeatTimer = setInterval(() => {
			void this.heartbeat(client.uptime ?? 0);
		}, HEARTBEAT_MS);
		heartbeatTimer.unref?.();
	},

	/** Gateway dropped — stop heartbeating but keep the interval open. */
	pause(): void {
		if (heartbeatTimer) {
			clearInterval(heartbeatTimer);
			heartbeatTimer = null;
		}
		connected = false;
	},

	/** Gateway is back — resume heartbeats on the still-open interval. */
	async resume(client: UptimeClient): Promise<void> {
		if (connected || !current) return;
		connected = true;
		this._armHeartbeat(client);
		await this.heartbeat(client.uptime ?? 0);
	},

	async heartbeat(clientUptimeMs: number): Promise<void> {
		if (!current || !connected) return;
		try {
			await BotUptime.updateOne(
				{ _id: current._id },
				{ $set: { lastHeartbeatAt: new Date(), clientUptimeMs } }
			);
		} catch {
			// transient mongo hiccup — the next heartbeat retries
		}
	},

	/** Graceful close: SIGTERM/SIGINT. */
	async stop(reason: string, clientUptimeMs = 0): Promise<void> {
		this.pause();
		const doc = current;
		current = null;
		if (!doc) return;
		try {
			const ended = new Date();
			doc.endedAt = ended;
			doc.reason = reason;
			doc.lastHeartbeatAt = ended;
			if (clientUptimeMs) doc.clientUptimeMs = clientUptimeMs;
			await doc.save();
			log(`interval closed (${reason})`);
		} catch (error) {
			container.logger.warn('[UptimeService] failed to close uptime interval:', error);
		}
	},

	/**
	 * Fraction of `windowMs` ending now during which the bot was alive.
	 * Returns `null` when there is no data at all (fresh install).
	 */
	async uptimePercent(windowMs: number): Promise<number | null> {
		const now = Date.now();
		const windowStart = new Date(now - windowMs);
		const intervals = await BotUptime.find({
			$or: [{ startedAt: { $gte: windowStart } }, { endedAt: { $gte: windowStart } }, { endedAt: null }]
		})
			.sort({ startedAt: 1 })
			.lean();
		if (intervals.length === 0) return null;

		let covered = 0;
		for (const iv of intervals) {
			const aliveFrom = Math.max(iv.startedAt.getTime(), windowStart.getTime());
			// Alive until: endedAt for graceful stops; lastHeartbeatAt (+ grace)
			// for ungraceful deaths; `now` while heartbeats are fresh on the
			// currently-open interval. `lastHeartbeatAt` is always bumped on
			// close, so a graceful stop doesn't lose its final seconds.
			let aliveUntil: number;
			if (iv.endedAt) {
				aliveUntil = iv.endedAt.getTime();
			} else {
				const hb = iv.lastHeartbeatAt?.getTime() ?? iv.startedAt.getTime();
				aliveUntil = Math.min(hb + STALE_HEARTBEAT_MS, now);
			}
			aliveUntil = Math.min(aliveUntil, now);
			if (aliveUntil > aliveFrom) covered += aliveUntil - aliveFrom;
		}
		return Math.min(1, covered / windowMs);
	},

	/** Currently-open interval, if any. */
	async currentSession(): Promise<{ startedAt: Date; lastHeartbeatAt: Date; clientUptimeMs: number } | null> {
		const doc = current ?? (await BotUptime.findOne({ endedAt: null }).sort({ startedAt: -1 }).lean());
		if (!doc) return null;
		return {
			startedAt: doc.startedAt,
			lastHeartbeatAt: doc.lastHeartbeatAt,
			clientUptimeMs: doc.clientUptimeMs
		};
	},

	/** Drop intervals older than the retention window. Call occasionally. */
	async prune(): Promise<void> {
		try {
			await BotUptime.deleteMany({ startedAt: { $lt: new Date(Date.now() - RETENTION_MS) } });
		} catch (error) {
			container.logger.warn('[UptimeService] prune failed:', error);
		}
	},

	/** Test hook — forget in-memory state without touching mongo. */
	_resetForTests(): void {
		if (heartbeatTimer) clearInterval(heartbeatTimer);
		heartbeatTimer = null;
		current = null;
		connected = false;
	}
};
