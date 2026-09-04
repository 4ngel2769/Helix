import type { OAuth2Guild } from 'discord.js';

const DISCORD_USER_GUILDS_URL = 'https://discord.com/api/users/@me/guilds';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function readDiscordErrorMessage(payload: unknown): string | undefined {
    if (!isRecord(payload)) {
        return undefined;
    }

    const message = payload.message;
    return typeof message === 'string' ? message : undefined;
}

export class DiscordApiError extends Error {
	status: number;
	retryAfterMs: number;

	constructor(status: number, message: string, retryAfterMs = 0) {
		super(message);
		this.name = 'DiscordApiError';
		this.status = status;
		this.retryAfterMs = retryAfterMs;
	}
}

function readRetryAfterMs(payload: unknown): number {
	if (!isRecord(payload)) return 0;
	const raw = payload.retry_after ?? payload.retryAfter;
	const seconds = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
	if (!Number.isFinite(seconds) || seconds <= 0) return 0;
	return Math.ceil(seconds * 1000);
}

function isOAuth2Guild(value: unknown): value is OAuth2Guild {
	if (!isRecord(value)) {
		return false;
	}

    if (typeof value.id !== 'string' || typeof value.name !== 'string') {
        return false;
    }

    if ('icon' in value && value.icon !== null && typeof value.icon !== 'string') {
        return false;
    }

    return true;
}

function parseOAuth2Guilds(payload: unknown): OAuth2Guild[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload.filter(isOAuth2Guild);
}

export async function fetchOAuth2Guilds(token: string): Promise<OAuth2Guild[]> {
    const response = await fetch(DISCORD_USER_GUILDS_URL, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const payload: unknown = await response.json();

    if (!response.ok) {
        const discordErrorMessage = readDiscordErrorMessage(payload);
        const fallbackMessage = `${response.status} ${response.statusText}`;
        throw new DiscordApiError(response.status, discordErrorMessage ?? fallbackMessage, readRetryAfterMs(payload));
    }

    return parseOAuth2Guilds(payload);
}

export function getDiscordGuildIconUrl(guild: Pick<OAuth2Guild, 'id' | 'icon'>): string {
    if (!guild.icon) {
        return 'https://cdn.discordapp.com/embed/avatars/0.png';
    }

    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
}
