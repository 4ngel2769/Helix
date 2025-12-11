import { container } from '@sapphire/framework';
import type { APIUser, OAuth2Guild } from 'discord.js';
import { PermissionsBitField } from 'discord.js';

const DISCORD_API = 'https://discord.com/api';

type FetchResult<T> = { data: T | null; error?: string };

async function fetchFromDiscord<T>(path: string, token: string): Promise<FetchResult<T>> {
	try {
		const response = await fetch(`${DISCORD_API}${path}`, {
			headers: { Authorization: `Bearer ${token}` }
		});

		if (!response.ok) {
			const message = `${response.status} ${response.statusText}`;
			container.logger.warn(`Discord API error on ${path}: ${message}`);
			return { data: null, error: message };
		}

		const json = (await response.json()) as T;
		return { data: json };
	} catch (error) {
		container.logger.error(`Discord API fetch failed for ${path}`, error);
		return { data: null, error: 'network_error' };
	}
}

export async function fetchDiscordUser(token: string): Promise<APIUser | null> {
	const { data } = await fetchFromDiscord<APIUser>('/users/@me', token);
	return data;
}

export async function fetchUserGuilds(token: string): Promise<OAuth2Guild[]> {
	const { data } = await fetchFromDiscord<OAuth2Guild[]>('/users/@me/guilds', token);
	return data ?? [];
}

export function canManageGuild(guild: OAuth2Guild): boolean {
	// Discord returns bigint-like permission bitfields; use .bitfield when present
	const permissions = guild.permissions?.bitfield ?? 0n;
	const bitfield = new PermissionsBitField(permissions);
	return bitfield.has(PermissionsBitField.Flags.Administrator) || bitfield.has(PermissionsBitField.Flags.ManageGuild);
}

export function withGuildIcon(guild: OAuth2Guild) {
	return {
		...guild,
		iconUrl: guild.icon
			? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
			: 'https://cdn.discordapp.com/embed/avatars/0.png'
	};
}

export async function getGuildForUser(token: string, guildId: string): Promise<OAuth2Guild | null> {
	const guilds = await fetchUserGuilds(token);
	return guilds.find((guild) => guild.id === guildId) ?? null;
}

