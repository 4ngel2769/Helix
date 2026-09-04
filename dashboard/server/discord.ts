import { dashboardConfig } from './config';

const DISCORD_API = 'https://discord.com/api/v10';
const SCOPES = ['identify', 'guilds'].join(' ');

export function redirectUri(): string {
	return `${dashboardConfig.publicUrl}/api/auth/callback`;
}

export function loginUrl(state: string): string {
	const params = new URLSearchParams({
		client_id: dashboardConfig.discord.clientId,
		response_type: 'code',
		redirect_uri: redirectUri(),
		scope: SCOPES,
		state,
		prompt: 'consent'
	});
	return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function botInviteUrl(guildId?: string): string {
	const params = new URLSearchParams({
		client_id: dashboardConfig.discord.clientId,
		scope: 'bot applications.commands',
		permissions: dashboardConfig.session.invitePermissions
	});
	if (guildId) {
		params.set('guild_id', guildId);
		params.set('disable_guild_select', 'true');
	}
	return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

interface TokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
	scope: string;
}

interface DiscordUser {
	id: string;
	username: string;
	avatar: string | null;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
	const body = new URLSearchParams({
		client_id: dashboardConfig.discord.clientId,
		client_secret: dashboardConfig.discord.clientSecret,
		code,
		grant_type: 'authorization_code',
		redirect_uri: redirectUri()
	});
	const res = await fetch(`${DISCORD_API}/oauth2/token`, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body
	});
	if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
	return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
	const body = new URLSearchParams({
		client_id: dashboardConfig.discord.clientId,
		client_secret: dashboardConfig.discord.clientSecret,
		grant_type: 'refresh_token',
		refresh_token: refreshToken
	});
	const res = await fetch(`${DISCORD_API}/oauth2/token`, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body
	});
	if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
	return (await res.json()) as TokenResponse;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
	const res = await fetch(`${DISCORD_API}/users/@me`, {
		headers: { authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) throw new Error(`Failed to fetch Discord user: ${res.status}`);
	const data = (await res.json()) as DiscordUser;
	return { id: data.id, username: data.username, avatar: data.avatar };
}

export function avatarUrl(userId: string, avatar: string | null): string | null {
	if (!avatar) return null;
	const ext = avatar.startsWith('a_') ? 'gif' : 'png';
	return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${ext}?size=128`;
}
