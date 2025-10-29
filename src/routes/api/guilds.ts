import { Route } from '../../lib/structures/Route';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse, RouteOptions } from '@sapphire/plugin-api';
import { HttpCodes } from '@sapphire/plugin-api';
import axios from 'axios';
import config from '../../config';
import { PermissionFlagsBits } from 'discord.js';

@ApplyOptions<RouteOptions>({
    route: 'guilds'
})
export class GuildsRoute extends Route {
    public override async run(request: ApiRequest, response: ApiResponse) {
        const token = this.getTokenFromRequest(request);

        if (!token) {
            return response.status(HttpCodes.Unauthorized).json({
                success: false,
                error: 'Not authenticated'
            });
        }

        try {
            // Fetch user's guilds from Discord
            const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const userGuilds = guildsResponse.data;

            // Filter guilds where user has admin permissions
            const manageableGuilds = userGuilds.filter((guild: any) => {
                const permissions = BigInt(guild.permissions);
                return (
                    guild.owner ||
                    (permissions & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator ||
                    (permissions & PermissionFlagsBits.ManageGuild) === PermissionFlagsBits.ManageGuild
                );
            });

            // Get bot's guilds
            const botGuilds = (this as any).container.client.guilds.cache;

            // Map guilds with bot presence
            const guildsWithBot = manageableGuilds.map((guild: any) => {
                const botInGuild = botGuilds.has(guild.id);
                return {
                    id: guild.id,
                    name: guild.name,
                    icon: guild.icon
                        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
                        : null,
                    owner: guild.owner,
                    permissions: guild.permissions,
                    botPresent: botInGuild
                };
            });

            return response.json({
                success: true,
                guilds: guildsWithBot
            });
        } catch (error) {
            console.error('Failed to fetch guilds:', error);
            return response.status(HttpCodes.InternalServerError).json({
                success: false,
                error: 'Failed to fetch guilds'
            });
        }
    }

    private getTokenFromRequest(request: ApiRequest): string | null {
        const cookieHeader = request.headers.cookie;
        if (!cookieHeader) return null;

        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {} as Record<string, string>);

        return cookies[config.api.auth.cookie] || null;
    }
}
