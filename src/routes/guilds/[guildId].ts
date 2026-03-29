import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import type { OAuth2Guild } from 'discord.js';
import { fetchOAuth2Guilds, getDiscordGuildIconUrl } from '../../lib/utils/discordGuilds';

@ApplyOptions<RouteOptions>({
    methods: ['GET']
})
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
            const userGuilds = await fetchOAuth2Guilds(request.auth.token);
            const guild = userGuilds.find((g: OAuth2Guild) => g.id === guildId);

            if (!guild) {
                return response.status(404).json({ error: 'Guild not found or not accessible by user' });
            }

            const enrichedGuild = {
                ...guild,
                hasBot: this.container.client.guilds.cache.has(guild.id),
                icon: getDiscordGuildIconUrl(guild)
            };

            return response.json({ guild: enrichedGuild });
        } catch (error) {
            return response.status(500).json({ error: 'Failed to fetch guild' });
        }
    }
}
