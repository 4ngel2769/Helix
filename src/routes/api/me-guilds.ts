import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { getDiscordGuildIconUrl } from '../../lib/utils/discordGuilds';
import { canManageGuild, requireAuth } from '../../lib/utils/apiAuth';

/**
 * Authenticated user's guilds, enriched with bot presence + manageability.
 * Used by the dashboard / MCP to pick a server to configure.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-me-guilds',
	route: 'me/guilds',
	methods: ['GET']
})
export class ApiMeGuildsRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		try {
			const auth = await requireAuth(request, response);
			if (!auth) return undefined;

			const guilds = auth.userGuilds.map((guild) => ({
				id: guild.id,
				name: guild.name,
				icon: getDiscordGuildIconUrl(guild),
				owner: guild.owner ?? false,
				permissions: String((guild as unknown as Record<string, unknown>).permissions ?? '0'),
				canManage: canManageGuild(guild),
				hasBot: this.container.client.guilds.cache.has(guild.id)
			}));

			const manageable = guilds.filter((g) => g.canManage);

			return response.json({ total: guilds.length, manageable: manageable.length, guilds, manageableGuilds: manageable });
		} catch {
			return response.status(500).json({ error: 'Failed to load user guilds' });
		}
	}
}
