import { Route } from '@sapphire/plugin-api';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { OAuth2Guild } from 'discord.js';

export class GuildsRoute extends Route {
    public override async run(request: ApiRequest, response: ApiResponse) {
        if (!request.auth?.token) {
            return response.status(401).json({ error: 'Unauthorized' });
        }

        const { guildId } = request.params;
        if (!guildId) {
            return response.status(400).json({ error: 'Missing guildId parameter' });
        }

        try {
            const userGuilds = await this.fetchUserGuilds(request.auth.token);
            const guild = userGuilds.find((g: OAuth2Guild) => g.id === guildId);

            if (!guild) {
                return response.status(404).json({ error: 'Guild not found or not accessible by user' });
            }

            const enrichedGuild = {
                ...guild,
                hasBot: this.container.client.guilds.cache.has(guild.id),
                icon: guild.icon
                    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
                    : 'https://cdn.discordapp.com/embed/avatars/0.png'
            };

            return response.json({ guild: enrichedGuild });
        } catch (error) {
            return response.status(500).json({ error: 'Failed to fetch guild' });
        }
    }

    private async fetchUserGuilds(token: string): Promise<OAuth2Guild[]> {
        const response = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
            let errorMessage = `Failed to fetch guilds: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData && typeof errorData === 'object' && 'message' in errorData) {
                    errorMessage = `Failed to fetch guilds: ${(errorData as { message: string }).message}`;
                }
            } catch (_) {}
            throw new Error(errorMessage);
        }
        const data = await response.json();
        return data as OAuth2Guild[];
    }
}
