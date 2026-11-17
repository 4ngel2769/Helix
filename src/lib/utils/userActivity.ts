import { User } from '../../models/User';

const DISCORD_EPOCH = 1_420_070_400_000;

/** Discord account creation date is encoded in the snowflake — no REST call needed. */
export function accountCreatedAt(userId: string): Date | null {
	const snowflake = Number(userId);
	if (!Number.isSafeInteger(snowflake) || snowflake <= 0) return null;
	const ms = Math.floor(snowflake / 4_194_304) + DISCORD_EPOCH;
	return Number.isFinite(ms) ? new Date(ms) : null;
}

/**
 * Lightweight, non-fatal activity write used by the command-run listeners.
 * One upsert per command keeps the admin user table fresh without touching
 * every command file. Counters start at deployment; existing rows show 0.
 */
export async function trackUserActivity(params: {
	userId: string;
	username: string;
	avatarHash?: string | null;
	commandName: string;
}): Promise<void> {
	const now = new Date();
	const set: Record<string, unknown> = {
		username: params.username,
		lastSeen: now,
		lastCommandAt: now,
		lastCommandName: params.commandName.slice(0, 64)
	};
	if (params.avatarHash) set.avatarHash = params.avatarHash;
	const created = accountCreatedAt(params.userId);
	if (created) set.accountCreatedAt = created;
	try {
		await User.updateOne(
			{ userId: params.userId },
			{
				$setOnInsert: { userId: params.userId, discriminator: '0' },
				$set: set,
				$inc: { commandsRun: 1 }
			},
			{ upsert: true }
		);
	} catch {
		// Analytics must never break a command.
	}
}
