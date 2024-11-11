import { Route } from '../lib/structures/Route';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import { HttpCodes } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';

@ApplyOptions<RouteOptions>({
    name: 'guilds',
    route: 'guilds'
})
export class UserGuildsRoute extends Route {
    public override async run(request: ApiRequest, response: ApiResponse) {
        if (!request.auth?.token) {
            return response.status(HttpCodes.Unauthorized).json({
                error: 'Unauthorized'
            });
        }

        try {
            const guilds = request.auth.token.guilds;
            if (!guilds) {
                return response.status(HttpCodes.BadRequest).json({
                    error: 'No guilds found'
                });
            }

            const enrichedGuilds = guilds.map((guild) => ({
                ...guild,
                hasBot: this.container.client.guilds.cache.has(guild.id),
                icon: guild.icon 
                    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` 
                    : 'https://cdn.discordapp.com/embed/avatars/0.png'
            }));

            return response.json({
                success: true,
                data: { guilds: enrichedGuilds }
            });
        } catch (error) {
            this.container.logger.error(error);
            return response.status(HttpCodes.InternalServerError).json({
                error: 'Failed to fetch guilds'
            });
        }
    }
} 