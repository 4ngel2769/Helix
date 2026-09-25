import { container } from '@sapphire/framework';
import { ChannelType, PermissionFlagsBits, PermissionsBitField, type Guild as DjsGuild, type GuildBasedChannel } from 'discord.js';
import { Guild } from '../../models/Guild';

type Lockable = Extract<GuildBasedChannel, { permissionOverwrites: unknown }>;

interface OverwriteSnapshot {
	id: string;
	allow: string;
	deny: string;
	type: number;
}

/** 24h cap so a forgotten `lockdown` can't take a server offline indefinitely. */
const MAX_AUTO_UNLOCK_MS = 24 * 60 * 60 * 1000;

function isLockable(channel: GuildBasedChannel): channel is Lockable {
	return (
		(channel.type === ChannelType.GuildText ||
			channel.type === ChannelType.GuildAnnouncement ||
			channel.type === ChannelType.GuildForum ||
			channel.type === ChannelType.GuildVoice) &&
		'permissionOverwrites' in channel
	);
}

function snapshot(guild: DjsGuild, channel: Lockable): OverwriteSnapshot[] {
	const everyone = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
	if (!everyone) return [];
	return [{ id: everyone.id, allow: everyone.allow.bitfield.toString(), deny: everyone.deny.bitfield.toString(), type: everyone.type }];
}

async function restore(guild: DjsGuild, channel: GuildBasedChannel, saved: OverwriteSnapshot[]): Promise<void> {
	if (!isLockable(channel)) return;
	const everyone = guild.roles.everyone;
	if (saved.length === 0) {
		// No snapshot recorded (pre-existing records): just clear the lock bit.
		await channel.permissionOverwrites.edit(everyone, { SendMessages: null });
		return;
	}
	const entry = saved[0]!;
	await channel.permissionOverwrites.edit(everyone, {
		SendMessages: new PermissionsBitField(BigInt(entry.allow)).has(PermissionFlagsBits.SendMessages) ? true : null
	});
}

export interface LockResult {
	channelId: string;
	channelName: string;
	ok: boolean;
	skipped?: string;
}

export class ChannelLockService {
	/** Persist the lock, deny @everyone SendMessages, and schedule the unlock. */
	public static async lock(
		guild: DjsGuild,
		channel: GuildBasedChannel,
		opts: { by: string; byTag: string; reason: string; durationMs?: number }
	): Promise<LockResult> {
		const id = channel.id;
		if (!isLockable(channel)) return { channelId: id, channelName: channel.name, ok: false, skipped: 'not a lockable channel' };
		const everyone = guild.roles.everyone;

		await channel.permissionOverwrites.edit(everyone, { SendMessages: false });

		const durationMs = opts.durationMs ? Math.min(Math.max(1000, opts.durationMs), MAX_AUTO_UNLOCK_MS) : 0;
		const now = Date.now();
		const record = {
			channelId: id,
			originalPermissions: snapshot(guild, channel),
			lockedBy: opts.by,
			lockedAt: new Date(),
			reason: opts.reason,
			lockTimestamp: now,
			duration: durationMs,
			unlockTimestamp: durationMs ? now + durationMs : 0,
			moderator: { id: opts.by, tag: opts.byTag }
		};

		const doc = await Guild.findOne({ guildId: guild.id });
		if (doc) {
			const list = doc.lockedChannels ?? [];
			doc.lockedChannels = [...list.filter((lock) => lock.channelId !== id), record] as typeof doc.lockedChannels;
			await doc.save();
		}

		if (durationMs) ChannelLockService.scheduleUnlock(guild.id, id, now + durationMs);
		return { channelId: id, channelName: channel.name, ok: true };
	}

	public static async unlock(guild: DjsGuild, channelId: string): Promise<boolean> {
		const channel = guild.channels.cache.get(channelId);
		if (!channel) return false;
		const doc = await Guild.findOne({ guildId: guild.id }, { lockedChannels: 1 }).lean();
		const saved = doc?.lockedChannels?.find((lock) => lock.channelId === channelId)?.originalPermissions ?? [];
		await restore(guild, channel, saved as OverwriteSnapshot[]);
		await Guild.updateOne({ guildId: guild.id }, { $pull: { lockedChannels: { channelId } } });
		return true;
	}

	/** Unlock everything currently recorded as locked in this guild. */
	public static async unlockAll(guild: DjsGuild): Promise<number> {
		const doc = await Guild.findOne({ guildId: guild.id }, { lockedChannels: 1 }).lean();
		const ids = (doc?.lockedChannels ?? []).map((lock) => lock.channelId);
		let done = 0;
		for (const id of ids) {
			if (await ChannelLockService.unlock(guild, id).catch(() => false)) done += 1;
		}
		return done;
	}

	/** Lock every lockable channel that isn't locked already. */
	public static async lockAll(guild: DjsGuild, opts: { by: string; byTag: string; reason: string; durationMs?: number }): Promise<LockResult[]> {
		const doc = await Guild.findOne({ guildId: guild.id }, { lockedChannels: 1 }).lean();
		const locked = new Set((doc?.lockedChannels ?? []).map((lock) => lock.channelId));
		const targets = [...guild.channels.cache.values()].filter((channel) => isLockable(channel) && !locked.has(channel.id));
		const results: LockResult[] = [];
		for (const channel of targets) {
			results.push(await ChannelLockService.lock(guild, channel, opts).catch((error) => ({ channelId: channel.id, channelName: channel.name, ok: false, skipped: String(error) })));
		}
		return results;
	}

	/** In-process timer. Lost on restart, so boot calls sweepExpired() too. */
	public static scheduleUnlock(guildId: string, channelId: string, at: number): void {
		const delay = Math.max(0, at - Date.now());
		setTimeout(async () => {
			const guild = container.client.guilds.cache.get(guildId);
			if (guild) await ChannelLockService.unlock(guild, channelId).catch(() => false);
		}, delay).unref?.();
	}

	/** Unlock anything whose auto-unlock time already passed (e.g. after a restart). */
	public static async sweepExpired(client: { guilds: { cache: Map<string, DjsGuild> } }): Promise<number> {
		const now = Date.now();
		const guilds = await Guild.find({ 'lockedChannels.unlockTimestamp': { $gt: 0, $lte: now } }, { guildId: 1, lockedChannels: 1 }).lean().catch(() => []);
		let unlocked = 0;
		for (const row of guilds) {
			const guild = client.guilds.cache.get(row.guildId);
			if (!guild) continue;
			for (const lock of row.lockedChannels ?? []) {
				if (!lock.unlockTimestamp || lock.unlockTimestamp > now) continue;
				if (await ChannelLockService.unlock(guild, lock.channelId).catch(() => false)) unlocked += 1;
			}
		}
		return unlocked;
	}
}
