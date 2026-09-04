import type { DashboardUser, GuildDetail } from './types';
import { ApiError, api } from './api';

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(error: unknown, fallbackMs: number): number | null {
	if (error instanceof ApiError && error.status === 429) {
		const data = error.data as { retryAfterMs?: unknown } | null;
		const raw = typeof data?.retryAfterMs === 'number' ? data.retryAfterMs : fallbackMs;
		return Math.min(Math.max(raw, 500), 10000);
	}
	return null;
}

// ---- Current user ----
export const session = $state<{ user: DashboardUser | null; isDeveloper: boolean; loaded: boolean; error: string | null }>({
	user: null,
	isDeveloper: false,
	loaded: false,
	error: null
});

export async function loadSession(): Promise<void> {
	try {
		const data = (await (await fetch('/api/me')).json()) as { user?: DashboardUser; isDeveloper?: boolean; error?: string };
		if (data.user) {
			session.user = data.user;
			session.isDeveloper = data.isDeveloper === true;
			session.error = null;
		} else {
			session.user = null;
			session.isDeveloper = false;
			session.error = data.error ?? 'Unauthorized';
		}
	} catch {
		session.user = null;
		session.isDeveloper = false;
		session.error = 'Unreachable';
	}
	session.loaded = true;
}

export async function logout(): Promise<void> {
	await fetch('/api/auth/logout', { method: 'POST' });
	session.user = null;
	session.isDeveloper = false;
}

// ---- Per-guild cache (detail + raw config) ----
interface GuildEntry {
	detail: GuildDetail | null;
	config: Record<string, unknown> | null;
	loading: boolean;
	error: string | null;
}

export const guildCache = $state<Record<string, GuildEntry>>({});

const EMPTY_ENTRY: GuildEntry = { detail: null, config: null, loading: true, error: null };

/** Creates the cache entry if missing. Only call from effects/events/loaders — never from $derived or templates. */
export function ensureGuildEntry(guildId: string): GuildEntry {
	if (!guildCache[guildId]) {
		guildCache[guildId] = { detail: null, config: null, loading: false, error: null };
	}
	// Re-read through the $state proxy: mutating the raw object handed to the
	// cache would bypass reactivity and the UI would never update.
	return guildCache[guildId]!;
}

/**
 * Read-only access, safe to use inside $derived and templates.
 * Returns a shared empty placeholder until ensureGuildEntry() has run.
 */
export function guildEntry(guildId: string): GuildEntry {
	return guildCache[guildId] ?? EMPTY_ENTRY;
}

export async function loadGuild(guildId: string, force = false, retried = false): Promise<void> {
	const entry = ensureGuildEntry(guildId);
	if (entry.loading || (entry.detail && !force)) return;
	entry.loading = true;
	entry.error = null;
	try {
		const [detailRes, configRes] = await Promise.all([
			api<{ guild: GuildDetail }>(`/guilds/${guildId}`),
			api<{ config: Record<string, unknown> }>(`/guilds/${guildId}/config`)
		]);
		entry.detail = detailRes.guild;
		entry.config = configRes.config;
	} catch (error) {
		const waitMs = retried ? null : retryAfterMs(error, 2000);
		if (waitMs !== null) {
			// Discord throttled us — wait it out and try once more instead of failing the page.
			await sleep(waitMs);
			entry.loading = false;
			return loadGuild(guildId, force, true);
		}
		entry.error = error instanceof Error ? error.message : 'Failed to load server';
	} finally {
		entry.loading = false;
	}
}

/** PATCH a slice of the guild config and merge the result back into the cache. */
export async function saveGuildConfig(guildId: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
	const entry = ensureGuildEntry(guildId);
	const res = await api<{ config: Record<string, unknown> }>(`/guilds/${guildId}/config`, {
		method: 'PATCH',
		body: patch
	});
	entry.config = res.config;
	return res.config;
}
