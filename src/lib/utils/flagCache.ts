import { Guild } from '../../models/Guild';
import { User } from '../../models/User';

export interface GuildFlags {
	disabled: boolean;
	banned: boolean;
	message: string | null;
}

const guilds = new Map<string, GuildFlags>();
const users = new Map<string, boolean>();
const MAX_CACHED_USERS = 10_000;

/**
 * Owner kill-switch flags with zero per-command DB cost: every check is a
 * Map lookup. Entries are filled on first miss and refreshed explicitly by
 * the dev API after each toggle — no TTL polling, no extra latency.
 */
export async function loadGuildFlags(guildId: string): Promise<GuildFlags> {
	const hit = guilds.get(guildId);
	if (hit) return hit;
	let flags: GuildFlags = { disabled: false, banned: false, message: null };
	try {
		const doc = await Guild.findOne({ guildId }, { botDisabled: 1, guildBanned: 1, disabledMessage: 1 }).lean();
		if (doc) {
			flags = {
				disabled: doc.botDisabled === true,
				banned: doc.guildBanned === true,
				message: typeof doc.disabledMessage === 'string' ? doc.disabledMessage : null
			};
		}
	} catch {
		// fail open on DB errors — never break commands because flags can't load
	}
	guilds.set(guildId, flags);
	return flags;
}

export function storeGuildFlags(guildId: string, flags: GuildFlags): void {
	guilds.set(guildId, flags);
}

export function clearGuildFlags(guildId: string): void {
	guilds.delete(guildId);
}

export async function loadUserBanned(userId: string): Promise<boolean> {
	const hit = users.get(userId);
	if (hit !== undefined) return hit;
	let banned = false;
	try {
		banned = (await User.findOne({ userId }, { botBanned: 1 }).lean())?.botBanned === true;
	} catch {
		banned = false;
	}
	if (users.size >= MAX_CACHED_USERS) users.clear();
	users.set(userId, banned);
	return banned;
}

export function storeUserBanned(userId: string, banned: boolean): void {
	if (users.size >= MAX_CACHED_USERS) users.clear();
	users.set(userId, banned);
}
