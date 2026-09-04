import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { requireAuth, requireDev } from '../../lib/utils/apiAuth';

/**
 * Dev-only: every guild the bot is in, with owner identity.
 * Requires OWNER_IDS membership — normal users and server managers get 403.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-dev-guilds',
	route: 'dev/guilds',
	methods: ['GET']
})
export class ApiDevGuildsRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;
		const dev = await requireDev(auth, response);
		if (!dev) return undefined;

		try {
			const guilds = [...this.container.client.guilds.cache.values()]
				.map((guild) => {
					const owner = guild.members.cache.get(guild.ownerId)?.user ?? this.container.client.users.cache.get(guild.ownerId);
					return {
						id: guild.id,
						name: guild.name,
						icon: guild.iconURL({ size: 128 }),
						memberCount: guild.memberCount,
						ownerId: guild.ownerId,
						ownerUsername: owner?.username ?? null,
						joinedAt: guild.joinedAt?.toISOString() ?? null,
						channels: guild.channels.cache.size,
						roles: guild.roles.cache.size
					};
				})
				.sort((a, b) => b.memberCount - a.memberCount);

			return response.json({ total: guilds.length, guilds });
		} catch {
			return response.status(500).json({ error: 'Failed to load bot guilds' });
		}
	}
}
