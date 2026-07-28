const PREFIX_CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedPrefix {
	value: string;
	expiresAt: number;
}

const prefixCache = new Map<string, CachedPrefix>();

export function getGuildPrefixFromCache(guildId: string): string | null {
	const cached = prefixCache.get(guildId);
	if (!cached) return null;
	if (cached.expiresAt <= Date.now()) {
		prefixCache.delete(guildId);
		return null;
	}

	return cached.value;
}

export function setGuildPrefixInCache(guildId: string, prefix: string): void {
	prefixCache.set(guildId, {
		value: prefix,
		expiresAt: Date.now() + PREFIX_CACHE_TTL_MS
	});
}

export function clearGuildPrefixCache(guildId: string): void {
	prefixCache.delete(guildId);
}
