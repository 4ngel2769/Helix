import { Route, ApplyOptions, methods } from '@sapphire/plugin-api';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import { Guild } from '../models/Guild';
import { fetch } from '@sapphire/fetch';
import { PermissionsBitField } from 'discord.js';

@ApplyOptions<Route.Options>({
    route: 'guilds/:guildId/verification'
})
export class GuildVerificationRoute extends Route {
    public async [methods.POST](request: ApiRequest, response: ApiResponse) {
        if (!request.auth) {
            return response.status(401).json({ error: 'Unauthorized' });
        }

        const { guildId } = request.params;
        const token = request.auth.token;

        try {
            // 1. Check for permissions
            const userGuilds: any[] = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => res.json());

            const guild = userGuilds.find(g => g.id === guildId);

            if (!guild) {
                return response.status(403).json({ error: 'Forbidden: You are not in this guild.' });
            }

            const permissions = new PermissionsBitField(BigInt(guild.permissions));
            if (!permissions.has('ManageGuild')) {
                return response.status(403).json({ error: 'Forbidden: You do not have Manage Guild permission.' });
            }

            // 2. Get settings from request body
            const { verificationChannelId, verificationMessage, verificationRoleId } = request.body as any;

            // 3. Update settings in DB
            await Guild.findOneAndUpdate(
                { guildId },
                {
                    verificationChannelId,
                    verificationMessage,
                    verificationRoleId,
                    'verificationLastModifiedBy.username': request.auth.username,
                    'verificationLastModifiedBy.id': request.auth.id,
                    'verificationLastModifiedBy.timestamp': new Date()
                },
                { upsert: true, new: true }
            );

            return response.json({ message: 'Verification settings updated successfully.' });

        } catch (error) {
            this.container.client.logger.error(error);
            return response.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
