import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { OAuth2Guild } from 'discord.js';
import { PermissionFlagsBits } from 'discord.js';
import { container } from '@sapphire/framework';
import { fetchOAuth2Guilds } from './discordGuilds';

export interface AuthContext {
	token: string;
	userGuilds: OAuth2Guild[];
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
		const userGuilds = await fetchOAuth2Guilds(token);
		return { token, userGuilds };
	} catch {
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
