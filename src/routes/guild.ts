import { Route } from '@sapphire/framework';
import { ApiRequest, ApiResponse, HttpCodes } from '@sapphire/plugin-api';
import { Guild } from '../models/Guild';
import { fetch } from '@sapphire/fetch';
import { PermissionsBitField } from 'discord.js';

export class GuildRoute extends Route {
    public constructor(context: Route.LoaderContext, options: Route.Options) {
        super(context, {
            ...options,
            route: 'guilds/:guildId',
        });
    }

    public async get(request: ApiRequest, response: ApiResponse) {
        if (!request.auth) {
            return response.status(HttpCodes.Unauthorized).json({ error: 'Unauthorized' });
        }

        const { guildId } = request.params;
        const token = request.auth.token;

        try {
            // 1. Get user's guilds from Discord API to check for permissions
            const userGuilds: any[] = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => res.json());

            const guild = userGuilds.find(g => g.id === guildId);

            if (!guild) {
                return response.status(HttpCodes.Forbidden).json({ error: 'Forbidden: You are not in this guild.' });
            }

            const permissions = new PermissionsBitField(BigInt(guild.permissions));
            if (!permissions.has('ManageGuild')) {
                return response.status(HttpCodes.Forbidden).json({ error: 'Forbidden: You do not have Manage Guild permission.' });
            }

            // 2. Fetch guild channels and roles from Discord API
            const [channels, roles]: [any[], any[]] = await Promise.all([
                fetch(`https://discord.com/api/guilds/${guildId}/channels`, {
                    headers: { Authorization: `Bot ${process.env.TOKEN}` }
                }).then(res => res.json()),
                fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
                    headers: { Authorization: `Bot ${process.env.TOKEN}` }
                }).then(res => res.json())
            ]);

            // 3. Fetch guild settings from DB
            const guildSettings = await Guild.findOne({ guildId });

            // 4. Return all data
            return response.json({
                guild,
                channels,
                roles,
                settings: guildSettings
            });

        } catch (error) {
            this.container.client.logger.error(error);
            return response.status(HttpCodes.InternalServerError).json({ error: 'Internal Server Error' });
        }
    }
}
