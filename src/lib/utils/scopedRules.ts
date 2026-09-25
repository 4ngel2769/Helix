/**
 * Per-channel / per-role rule scoping shared by AutoMod and warn settings.
 *
 * Overrides live in one flat map keyed `c:<channelId>` / `r:<roleId>` so PATCH
 * validation stays trivial (same pattern as `logEventChannels`). Precedence:
 * guild-wide base -> channel override -> each role override (first role the
 * member has that has an override wins per key). `exempt` short-circuits and
 * skips enforcement entirely.
 */
export interface ScopedRule<T> {
	exempt?: boolean;
	settings?: Partial<T>;
}

export type ScopeMap<T> = Record<string, ScopedRule<T>>;

export const CHANNEL_SCOPE = 'c';
export const ROLE_SCOPE = 'r';

export function channelScope(channelId: string): string {
	return `${CHANNEL_SCOPE}:${channelId}`;
}

export function roleScope(roleId: string): string {
	return `${ROLE_SCOPE}:${roleId}`;
}

export function isValidScopeKey(key: string): boolean {
	return /^[cr]:\d{16,22}$/.test(key);
}

/** `c:123` -> `123`. Returns null for anything that isn't a scope key. */
export function scopeTarget(key: string): string | null {
	return isValidScopeKey(key) ? key.slice(2) : null;
}

export interface ResolvedScopes<T> {
	settings: T;
	exempt: boolean;
	scopes: string[];
}

export function resolveScopes<T extends object>(
	base: T,
	overrides: ScopeMap<T> | undefined,
	channelId: string | null | undefined,
	roleIds: Iterable<string>
): ResolvedScopes<T> {
	if (!overrides) return { settings: base, exempt: false, scopes: [] };

	const applied: string[] = [];
	let exempt = false;
	let settings = base;

	const apply = (key: string): void => {
		const rule = overrides[key];
		if (!rule) return;
		applied.push(key);
		if (rule.exempt) exempt = true;
		if (rule.settings) settings = { ...settings, ...rule.settings };
	};

	if (channelId) apply(channelScope(channelId));
	for (const roleId of roleIds) apply(roleScope(roleId));

	return { settings, exempt, scopes: applied };
}
