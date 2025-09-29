import { Route } from '@sapphire/plugin-api';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { OAuth2Guild } from 'discord.js';

export class GuildsRoute extends Route {
    public override async run(request: ApiRequest, response: ApiResponse) {
        if (!request.auth?.token) {
            return response.status(401).json({ error: 'Unauthorized' });
        }

        try {
            const userGuilds = await this.fetchUserGuilds(request.auth.token);
            
            const enrichedGuilds = userGuilds.map((guild: OAuth2Guild) => ({
                ...guild,
                hasBot: this.container.client.guilds.cache.has(guild.id),
                icon: guild.icon 
                    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` 
                    : 'https://cdn.discordapp.com/embed/avatars/0.png'
            }));

            return response.json({ guilds: enrichedGuilds });
        } catch (error) {
            return response.status(500).json({ error: 'Failed to fetch guilds' });
        }
    }

    private async fetchUserGuilds(token: string): Promise<OAuth2Guild[]> {
        const response = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
            // Try to extract error message from response, fallback to status text
            let errorMessage = `Failed to fetch guilds: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.message) {
                    errorMessage = `Failed to fetch guilds: ${errorData.message}`;
                }
            } catch (_) {
                // Ignore JSON parse errors, use default errorMessage
            }
            throw new Error(errorMessage);
        }
        const data = await response.json();
        return data as OAuth2Guild[];
    }
} 