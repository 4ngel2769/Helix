import type { DashboardUser, GuildDetail } from './types';
import { api } from './api';

// ---- Current user ----
export const session = $state<{ user: DashboardUser | null; loaded: boolean; error: string | null }>({
	user: null,
	loaded: false,
	error: null
});

export async function loadSession(): Promise<void> {
	try {
		const data = (await (await fetch('/api/me')).json()) as { user?: DashboardUser; error?: string };
		if (data.user) {
			session.user = data.user;
			session.error = null;
		} else {
			session.user = null;
			session.error = data.error ?? 'Unauthorized';
		}
	} catch {
		session.user = null;
		session.error = 'Unreachable';
	}
	session.loaded = true;
}

export async function logout(): Promise<void> {
	await fetch('/api/auth/logout', { method: 'POST' });
	session.user = null;
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
	let entry = guildCache[guildId];
	if (!entry) {
		entry = { detail: null, config: null, loading: false, error: null };
		guildCache[guildId] = entry;
	}
	return entry;
}

/**
 * Read-only access, safe to use inside $derived and templates.
 * Returns a shared empty placeholder until ensureGuildEntry() has run.
 */
export function guildEntry(guildId: string): GuildEntry {
	return guildCache[guildId] ?? EMPTY_ENTRY;
}

export async function loadGuild(guildId: string, force = false): Promise<void> {
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
