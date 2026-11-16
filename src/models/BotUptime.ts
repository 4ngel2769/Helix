import { Schema, model, type Document } from 'mongoose';

/**
 * One row per bot session (gateway connect → disconnect/crash).
 *
 * `endedAt` is only set for graceful stops. A crashed or OOM-killed process
 * leaves `endedAt` null forever, which is deliberate: uptime calculation
 * treats the interval as "alive until the last heartbeat, then dead until
 * the next interval's `startedAt`" — so an ungraceful death still counts as
 * downtime without needing a signal handler that can never run.
 */
export interface IBotUptime extends Document {
	startedAt: Date;
	endedAt: Date | null;
	/** 'ready' | 'shutdown' | 'disconnect' | 'replaced' */
	reason: string;
	lastHeartbeatAt: Date;
	/** Client uptime (ms) snapshot when the interval was last heartbeated. */
	clientUptimeMs: number;
}

const botUptimeSchema = new Schema<IBotUptime>(
	{
		startedAt: { type: Date, required: true, index: true },
		endedAt: { type: Date, default: null, index: true },
		reason: { type: String, default: 'ready' },
		lastHeartbeatAt: { type: Date, default: () => new Date() },
		clientUptimeMs: { type: Number, default: 0 }
	},
	{ collection: 'botuptimes', timestamps: false }
);

botUptimeSchema.index({ endedAt: 1, startedAt: 1 });

export const BotUptime = model<IBotUptime>('BotUptime', botUptimeSchema);
