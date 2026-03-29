import { Route } from '../lib/structures/Route';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import { HttpCodes } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import type { Module } from '@kbotdev/plugin-modules';
import { ErrorHandler } from '../lib/structures/ErrorHandler';
import { fetchOAuth2Guilds, getDiscordGuildIconUrl } from '../lib/utils/discordGuilds';

@ApplyOptions<RouteOptions>({
    name: 'dashboard',
    route: 'dashboard',
    methods: ['GET']
})
export class DashboardRoute extends Route {
    public override async run(request: ApiRequest, response: ApiResponse) {
        try {
            if (!request.auth?.token) {
                return response.status(HttpCodes.Unauthorized).json({
                    error: 'Unauthorized',
                    message: 'Authentication token is required'
                });
            }

            // Get modules data
            const modules = [...this.container.client.modules.values()];
            
            // Get guild data
            const userGuilds = await fetchOAuth2Guilds(request.auth.token);
            
            const enrichedGuilds = userGuilds.map((guild) => ({
                ...guild,
                hasBot: this.container.client.guilds.cache.has(guild.id),
                icon: getDiscordGuildIconUrl(guild)
            }));

            return response.json({
                authenticated: true,
                modules: modules.map((module: Module) => ({
                    name: module.name,
                    enabled: module.enabled,
                    description: module.description
                })),
                guilds: enrichedGuilds
            });
        } catch (error) {
            ErrorHandler.logError('Dashboard route error:', error);
            return response.status(HttpCodes.InternalServerError).json({
                error: 'An unexpected error occurred'
            });
        }
    }
}