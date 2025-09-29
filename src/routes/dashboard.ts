import { Route } from '../lib/structures/Route';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import { HttpCodes } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import type { Module } from '@kbotdev/plugin-modules';
import { ErrorHandler } from '../lib/structures/ErrorHandler';

@ApplyOptions<RouteOptions>({
    name: 'dashboard',
    route: 'dashboard'
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
            const userGuilds = await this.fetchUserGuilds(request.auth.token);
            
            const enrichedGuilds = userGuilds.map((guild) => ({
                ...guild,
                hasBot: this.container.client.guilds.cache.has(guild.id),
                icon: guild.icon 
                    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` 
                    : 'https://cdn.discordapp.com/embed/avatars/0.png'
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

    private async fetchUserGuilds(token: string): Promise<any[]> {
        try {
            const response = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            return data as any[];
        } catch (error) {
            console.error('Error fetching user guilds:', error);
            return [];
        }
    }
}