import { Route } from '../../../../lib/structures/Route';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse, RouteOptions } from '@sapphire/plugin-api';
import { HttpCodes } from '@sapphire/plugin-api';
import axios from 'axios';
import config from '../../../../config';
import { Guild } from '../../../../models/Guild';
import { PermissionFlagsBits } from 'discord.js';

@ApplyOptions<RouteOptions>({
    route: 'guild/:guildId/modules'
})
export class GuildModulesRoute extends Route {
    public override async run(request: ApiRequest, response: ApiResponse) {
        const token = this.getTokenFromRequest(request);
        const { guildId } = request.params;

        if (!token) {
            return response.status(HttpCodes.Unauthorized).json({
                success: false,
                error: 'Not authenticated'
            });
        }

        // Handle GET request
        if (request.method === 'GET') {
            return this.handleGet(token, guildId, response);
        }

        // Handle PATCH request
        if (request.method === 'PATCH') {
            return this.handlePatch(token, guildId, request, response);
        }

        return response.status(HttpCodes.MethodNotAllowed).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    private async handleGet(token: string, guildId: string, response: ApiResponse) {
        try {
            // Verify user has access to this guild
            const hasAccess = await this.verifyGuildAccess(token, guildId);
            if (!hasAccess) {
                return response.status(HttpCodes.Forbidden).json({
                    success: false,
                    error: 'You do not have permission to manage this server'
                });
            }

            // Fetch guild configuration
            let guildData = await Guild.findOne({ guildId });

            if (!guildData) {
                guildData = new Guild({ guildId });
                await guildData.save();
            }

            // Get all available modules from the bot
            const modules = [...(this as any).container.client.modules.values()];
            const allModules = modules.map((module: any) => ({
                key: module.name.toLowerCase(),
                name: module.name,
                description: module.description || '',
                enabled: guildData.modules?.[module.name.toLowerCase()] ?? true,
                emoji: module.emoji || '⚙️'
            }));

            return response.json({
                success: true,
                modules: allModules
            });
        } catch (error) {
            console.error('Failed to fetch guild modules:', error);
            return response.status(HttpCodes.InternalServerError).json({
                success: false,
                error: 'Failed to fetch modules'
            });
        }
    }

    private async handlePatch(token: string, guildId: string, request: ApiRequest, response: ApiResponse) {
        try {
            // Verify user has access to this guild
            const hasAccess = await this.verifyGuildAccess(token, guildId);
            if (!hasAccess) {
                return response.status(HttpCodes.Forbidden).json({
                    success: false,
                    error: 'You do not have permission to manage this server'
                });
            }

            // Parse body from request - read from raw body
            let body: any = {};
            try {
                const bodyData = await this.readRequestBody(request);
                body = bodyData ? JSON.parse(bodyData) : {};
            } catch (e) {
                console.error('Failed to parse request body:', e);
                body = {};
            }

            const { moduleKey, enabled } = body;

            if (!moduleKey || typeof enabled !== 'boolean') {
                return response.status(HttpCodes.BadRequest).json({
                    success: false,
                    error: 'Invalid request body'
                });
            }

            // Fetch guild configuration
            let guildData = await Guild.findOne({ guildId });

            if (!guildData) {
                guildData = new Guild({ guildId });
            }

            // Update module status
            if (!guildData.modules) {
                guildData.modules = {};
            }
            guildData.modules[moduleKey] = enabled;

            await guildData.save();

            return response.json({
                success: true,
                module: {
                    key: moduleKey,
                    enabled
                }
            });
        } catch (error) {
            console.error('Failed to update module:', error);
            return response.status(HttpCodes.InternalServerError).json({
                success: false,
                error: 'Failed to update module'
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

    private readRequestBody(request: ApiRequest): Promise<string> {
        return new Promise((resolve, reject) => {
            let body = '';
            request.on('data', (chunk: Buffer) => {
                body += chunk.toString();
            });
            request.on('end', () => {
                resolve(body);
            });
            request.on('error', reject);
        });
    }
}
