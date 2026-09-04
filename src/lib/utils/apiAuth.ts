import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { OAuth2Guild } from 'discord.js';
import { PermissionFlagsBits } from 'discord.js';
import { container } from '@sapphire/framework';
import { DiscordApiError, fetchOAuth2Guilds } from './discordGuilds';

export interface AuthContext {
	token: string;
	userGuilds: OAuth2Guild[];
}

// Discord's /users/@me/guilds is aggressively rate limited, and dashboard
// pages fire several authed calls at once — so cache per token (60s) and
// coalesce parallel fetches for the same token into one Discord request.
const GUILDS_CACHE_TTL_MS = 60_000;
const MAX_CACHED_TOKENS = 1000;
const MAX_DISCORD_WAIT_MS = 5000;

interface CachedGuilds {
	guilds: OAuth2Guild[];
	expiresAt: number;
}

const guildsCache = new Map<string, CachedGuilds>();
const guildsInflight = new Map<string, Promise<OAuth2Guild[]>>();

function pruneGuildsCache(): void {
	if (guildsCache.size <= MAX_CACHED_TOKENS) return;
	const now = Date.now();
	for (const [key, value] of guildsCache) {
		if (value.expiresAt <= now) guildsCache.delete(key);
		if (guildsCache.size <= MAX_CACHED_TOKENS) break;
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch with one retry honoring Discord's retry_after (capped). */
async function fetchUserGuilds(token: string): Promise<OAuth2Guild[]> {
	try {
		return await fetchOAuth2Guilds(token);
	} catch (error) {
		if (error instanceof DiscordApiError && error.status === 429) {
			const waitMs = Math.min(Math.max(error.retryAfterMs, 500), MAX_DISCORD_WAIT_MS);
			container.logger.warn(`[api] Discord rate limited guild fetch, retrying in ${waitMs}ms`);
			await sleep(waitMs);
			return fetchOAuth2Guilds(token);
		}
		throw error;
	}
}

async function getUserGuilds(token: string): Promise<OAuth2Guild[]> {
	const cached = guildsCache.get(token);
	if (cached && cached.expiresAt > Date.now()) return cached.guilds;

	const inflight = guildsInflight.get(token);
	if (inflight) return inflight;

	const pending = fetchUserGuilds(token)
		.then((guilds) => {
			pruneGuildsCache();
			guildsCache.set(token, { guilds, expiresAt: Date.now() + GUILDS_CACHE_TTL_MS });
			return guilds;
		})
		.finally(() => {
			if (guildsInflight.get(token) === pending) guildsInflight.delete(token);
		});
	guildsInflight.set(token, pending);
	return pending;
}

export function getToken(request: ApiRequest): string | null {
	// 1. Sapphire plugin-api cookie auth (set by POST /api/oauth/callback)
	if (request.auth?.token) return request.auth.token;

	// 2. Bearer fallback for external clients (MCP server, curl, dashboards):
	//    Authorization: Bearer <discord-oauth-access-token>
	const headers = (request as unknown as { headers?: Record<string, unknown> }).headers;
	const authorization = headers?.authorization ?? headers?.Authorization;
	if (typeof authorization === 'string') {
		const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
		if (match?.[1]) return match[1].trim();
	}

	return null;
}

export function unauthorized(response: ApiResponse, message = 'Authentication token is required') {
	return response.status(401).json({ error: 'Unauthorized', message });
}

export async function requireAuth(request: ApiRequest, response: ApiResponse): Promise<AuthContext | null> {
	const token = getToken(request);
	if (!token) {
		unauthorized(response);
		return null;
	}
	try {
		const userGuilds = await getUserGuilds(token);
		return { token, userGuilds };
	} catch (error) {
		// Log the Discord-side reason (expired/revoked token vs rate limit vs outage)
		// without ever logging the token itself.
		const message = error instanceof Error ? error.message : 'unknown error';
		if (error instanceof DiscordApiError && error.status === 429) {
			container.logger.warn(`[api] Discord rate limit still in effect (${message})`);
			response.status(429).json({
				error: 'RateLimited',
				message: 'Discord is rate limiting requests, please retry shortly',
				retryAfterMs: Math.min(Math.max(error.retryAfterMs, 500), MAX_DISCORD_WAIT_MS)
			});
			return null;
		}
		container.logger.warn(`[api] Discord rejected user token (${message})`);
		response.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired Discord token' });
		return null;
	}
}

export function canManageGuild(guild: OAuth2Guild): boolean {
	if (guild.owner) return true;
	const perms: unknown =
		(guild as unknown as Record<string, unknown>).permissions ?? (guild as unknown as { permissions?: unknown }).permissions;
	try {
		if (typeof perms === 'string' || typeof perms === 'number' || typeof perms === 'bigint') {
			return (BigInt(perms) & PermissionFlagsBits.ManageGuild) === PermissionFlagsBits.ManageGuild;
		}
		const maybeHas = (perms as { has?: unknown }).has;
		if (typeof maybeHas === 'function') {
			return (perms as { has: (flag: bigint) => boolean }).has(PermissionFlagsBits.ManageGuild);
		}
	} catch {
		return false;
	}
	return false;
}

export function findUserGuild(userGuilds: OAuth2Guild[], guildId: string): OAuth2Guild | undefined {
	return userGuilds.find((g) => g.id === guildId);
}

export function botHasGuild(guildId: string): boolean {
	return container.client.guilds.cache.has(guildId);
}

/**
 * Require the caller to be a member of the guild (present in OAuth2 guild list).
 * Returns the OAuth2 guild entry or sends the HTTP error and returns null.
 */
export function requireGuildMembership(
	auth: AuthContext,
	guildId: string,
	response: ApiResponse
): OAuth2Guild | null {
	const guild = findUserGuild(auth.userGuilds, guildId);
	if (!guild) {
		response.status(404).json({ error: 'Guild not found or not accessible by user' });
		return null;
	}
	return guild;
}

/**
 * Require MANAGE_GUILD (or ownership) plus the bot being in the guild.
 * Used by all mutating dashboard endpoints.
 */
export function requireManageableGuild(
	auth: AuthContext,
	guildId: string,
	response: ApiResponse
): OAuth2Guild | null {
	const guild = requireGuildMembership(auth, guildId, response);
	if (!guild) return null;
	if (!canManageGuild(guild)) {
		response.status(403).json({ error: 'Forbidden', message: 'MANAGE_GUILD permission is required' });
		return null;
	}
	if (!botHasGuild(guildId)) {
		response.status(409).json({ error: 'BotNotInGuild', message: 'The bot is not a member of this guild' });
		return null;
	}
	return guild;
}

export function readQueryParam(request: ApiRequest, key: string): string | undefined {
	const value = (request.query as Record<string, unknown>)[key];
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) return typeof value[0] === 'string' ? (value[0] as string) : undefined;
	return undefined;
}

export function readBody<T = Record<string, unknown>>(request: ApiRequest): T {
	const body = (request as unknown as Record<string, unknown>).body;
	return ((body ?? {}) as T);
}

/** Discord snowflake shape check — rejects objects/arrays used for operator injection. */
export function isSnowflake(value: unknown): value is string {
	return typeof value === 'string' && /^\d{16,22}$/.test(value);
}

/** Read a required plain-string field; returns null when missing or not a string. */
export function readString(body: Record<string, unknown>, key: string, maxLength = 2000): string | null {
	const value = body[key];
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (trimmed.length === 0 || trimmed.length > maxLength) return null;
	return trimmed;
}

/** Optional variant — undefined when absent, null when present-but-invalid. */
export function readOptionalString(body: Record<string, unknown>, key: string, maxLength = 2000): string | undefined | null {
	if (!(key in body) || body[key] === undefined || body[key] === null) return undefined;
	const value = body[key];
	if (typeof value !== 'string' || value.length > maxLength) return null;
	return value;
}

/** Validate an array-of-strings field (e.g. disabledCommands). */
export function readStringArray(body: Record<string, unknown>, key: string, maxItems = 500, maxItemLength = 64): string[] | null {
	const value = body[key];
	if (!Array.isArray(value)) return null;
	if (value.length > maxItems) return null;
	if (!value.every((v) => typeof v === 'string' && v.length <= maxItemLength)) return null;
	return [...value];
}

// ---- Discord identity (for self/dev scoping) ----

const DISCORD_ME_URL = 'https://discord.com/api/users/@me';
const USER_ID_CACHE_TTL_MS = 10 * 60_000;

const userIdCache = new Map<string, { id: string; expiresAt: number }>();

/** Resolve the Discord user id behind an OAuth token (cached 10 min). */
export async function getTokenUserId(token: string): Promise<string | null> {
	const cached = userIdCache.get(token);
	if (cached && cached.expiresAt > Date.now()) return cached.id;
	try {
		const response = await fetch(DISCORD_ME_URL, { headers: { Authorization: `Bearer ${token}` } });
		if (!response.ok) return null;
		const payload = (await response.json()) as { id?: unknown };
		if (typeof payload.id !== 'string' || !isSnowflake(payload.id)) return null;
		if (userIdCache.size > 2000) userIdCache.clear();
		userIdCache.set(token, { id: payload.id, expiresAt: Date.now() + USER_ID_CACHE_TTL_MS });
		return payload.id;
	} catch {
		return null;
	}
}

function botOwnerIds(): string[] {
	return (process.env.OWNER_IDS ?? process.env.DASHBOARD_OWNER_IDS ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter((s) => isSnowflake(s));
}

export function isBotOwner(userId: string): boolean {
	return botOwnerIds().includes(userId);
}

/**
 * Require the caller to be a bot developer (OWNER_IDS).
 * Used by dev-only dashboard endpoints.
 */
export async function requireDev(
	auth: AuthContext,
	response: ApiResponse
): Promise<{ userId: string } | null> {
	const userId = await getTokenUserId(auth.token);
	if (!userId || !isBotOwner(userId)) {
		response.status(403).json({ error: 'Forbidden', message: 'Bot developer access required' });
		return null;
	}
	return { userId };
}
