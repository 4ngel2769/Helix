import { container } from '@sapphire/framework';
import { Guild } from '../../models/Guild';

const CACHE_TTL_MS = 30_000;
const MAX_CACHED_GUILDS = 2000;

interface CachedDisabled {
	commands: string[];
	expiresAt: number;
}

const cache = new Map<string, CachedDisabled>();

function prune(): void {
	if (cache.size <= MAX_CACHED_GUILDS) return;
	const now = Date.now();
	for (const [key, value] of cache) {
		if (value.expiresAt <= now) cache.delete(key);
		if (cache.size <= MAX_CACHED_GUILDS) break;
	}
}

/** Commands that can never be disabled (recovery + help must always work). */
export const CRITICAL_COMMANDS = new Set(['settings', 'togglecommand', 'configmodule', 'help', 'prefix']);

export function clearDisabledCommandsCache(guildId: string): void {
	cache.delete(guildId);
}

export async function getDisabledCommands(guildId: string): Promise<string[]> {
	const cached = cache.get(guildId);
	if (cached && cached.expiresAt > Date.now()) return cached.commands;
	try {
		const doc = await Guild.findOne({ guildId }, { disabledCommands: 1 }).lean();
		const commands = Array.isArray(doc?.disabledCommands) ? (doc.disabledCommands as string[]) : [];
		prune();
		cache.set(guildId, { commands, expiresAt: Date.now() + CACHE_TTL_MS });
		return commands;
	} catch (error) {
		container.logger.warn(`[disabled-commands] DB lookup failed for ${guildId}:`, error);
		return cached?.commands ?? [];
	}
}

export async function isCommandDisabled(guildId: string | null, commandName: string): Promise<boolean> {
	if (!guildId) return false;
	if (CRITICAL_COMMANDS.has(commandName.toLowerCase())) return false;
	const disabled = await getDisabledCommands(guildId);
	return disabled.includes(commandName.toLowerCase());
}
