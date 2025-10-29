import { Route } from '../../../../lib/structures/Route';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse, RouteOptions } from '@sapphire/plugin-api';
import { HttpCodes } from '@sapphire/plugin-api';
import axios from 'axios';
import config from '../../../../config';
import { PermissionFlagsBits } from 'discord.js';

@ApplyOptions<RouteOptions>({
    route: 'guild/:guildId/roles'
})
export class GuildRolesRoute extends Route {
    public override async run(request: ApiRequest, response: ApiResponse) {
        const token = this.getTokenFromRequest(request);
        const { guildId } = request.params;

        if (!token) {
            return response.status(HttpCodes.Unauthorized).json({
                success: false,
                error: 'Not authenticated'
            });
        }

        try {
            // Verify user has access to this guild
            const hasAccess = await this.verifyGuildAccess(token, guildId);
            if (!hasAccess) {
                return response.status(HttpCodes.Forbidden).json({
                    success: false,
                    error: 'You do not have permission to manage this server'
                });
            }

            // Fetch guild from bot
            const guild = (this as any).container.client.guilds.cache.get(guildId);

            if (!guild) {
                return response.status(HttpCodes.NotFound).json({
                    success: false,
                    error: 'Bot is not in this server'
                });
            }

            // Get roles
            const roles = guild.roles.cache
                .filter(role => role.id !== guild.id) // Exclude @everyone
                .map(role => ({
                    id: role.id,
                    name: role.name,
                    color: role.hexColor,
                    position: role.position,
                    managed: role.managed
                }))
                .sort((a, b) => b.position - a.position);

            return response.json({
                success: true,
                roles
            });
        } catch (error) {
            console.error('Failed to fetch guild roles:', error);
            return response.status(HttpCodes.InternalServerError).json({
                success: false,
                error: 'Failed to fetch roles'
            });
        }
    }

    private async verifyGuildAccess(token: string, guildId: string): Promise<boolean> {
        try {
            const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const userGuilds = guildsResponse.data;
            const guild = userGuilds.find((g: any) => g.id === guildId);

            if (!guild) return false;

            const permissions = BigInt(guild.permissions);
            return (
                guild.owner ||
                (permissions & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator ||
                (permissions & PermissionFlagsBits.ManageGuild) === PermissionFlagsBits.ManageGuild
            );
        } catch {
            return false;
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
