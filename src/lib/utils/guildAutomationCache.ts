import { Guild, type LevelingSettings } from '../../models/Guild';

export interface GuildAutomation {
	leveling: LevelingSettings;
	automodSettings: Record<string, unknown>;
	levelingModuleOn: boolean;
}

const TTL_MS = 60_000;

interface Cached {
	value: GuildAutomation;
	expiresAt: number;
}

const cache = new Map<string, Cached>();

/**
 * One cached read per message for the messageCreate automations
 * (leveling + custom automod). Same TTL pattern as prefixCache.
 * Cleared by the guild-config API whenever relevant fields change.
 */
export async function getGuildAutomation(guildId: string): Promise<GuildAutomation | null> {
	const hit = cache.get(guildId);
	if (hit && hit.expiresAt > Date.now()) return hit.value;
	if (hit) cache.delete(guildId);
	try {
		const doc = await Guild.findOne(
			{ guildId },
			{ leveling: 1, automodSettings: 1, modules: 1 }
		).lean();
		if (!doc) return null;
		const value: GuildAutomation = {
			leveling: (doc.leveling ?? {}) as LevelingSettings,
			automodSettings: (doc.automodSettings ?? {}) as Record<string, unknown>,
			levelingModuleOn: (doc.modules as Record<string, boolean> | undefined)?.leveling !== false
		};
		cache.set(guildId, { value, expiresAt: Date.now() + TTL_MS });
		return value;
	} catch {
		return null;
	}
}

export function clearGuildAutomation(guildId: string): void {
	cache.delete(guildId);
}
