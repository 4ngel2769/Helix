import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';

/**
 * Public, sanitised guild directory for the Helix website.
 * Only exposes what any server-listing site shows: id, name,
 * approximate member count and the public CDN icon URL.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-guilds',
	route: 'guilds',
	methods: ['GET']
})
export class ApiGuildsRoute extends Route {
	public override run(_request: ApiRequest, response: ApiResponse) {
		const guilds = [...this.container.client.guilds.cache.values()]
			.map((guild) => ({
				id: guild.id,
				name: guild.name,
				memberCount: guild.memberCount ?? guild.approximateMemberCount ?? 0,
				icon: guild.iconURL({ size: 128 })
			}))
			.sort((a, b) => b.memberCount - a.memberCount)
			.slice(0, 60);

		return response.json({
			total: this.container.client.guilds.cache.size,
			guilds
		});
	}
}
