import { ApplyOptions } from '@sapphire/decorators';
import { HttpCodes, type ApiRequest, type ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { Route } from '../../lib/structures/Route';
import { canManageGuild, fetchUserGuilds, withGuildIcon } from '../../lib/utils/discordApi';

@ApplyOptions<RouteOptions>({
	name: 'guilds',
	route: 'guilds'
})
export class GuildsIndexRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		if (request.method?.toUpperCase() !== 'GET') {
			return response.status(HttpCodes.MethodNotAllowed).json({ error: 'Method not allowed' });
		}

		if (!request.auth?.token) {
			return response.status(HttpCodes.Unauthorized).json({ error: 'Unauthorized' });
		}

		const guilds = await fetchUserGuilds(request.auth.token);
		const enriched = guilds.map((guild) => ({
			...withGuildIcon(guild),
			manageable: canManageGuild(guild),
			hasBot: this.container.client.guilds.cache.has(guild.id)
		}));

		return response.json({ guilds: enriched });
	}
}

