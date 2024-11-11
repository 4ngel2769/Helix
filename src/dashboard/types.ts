import type { APIGuild } from 'discord.js';

export interface DiscordUser {
    id: string;
    username: string;
    guilds?: APIGuild[];
    accessToken?: string;
    refreshToken?: string;
} 