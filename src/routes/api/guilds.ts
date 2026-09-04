import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';

/**
 * Public, sanitised guild directory for the Helix website marquee
 * (name + icon) and the `helix_public_guilds` MCP tool.
 * Only exposes what any server-listing site shows: id, name,
 * approximate member count and the public CDN icon URL.
 *
 * CORS is intentionally open (`*`) — this is unauthenticated public
 * data, and the website fetches it cross-origin from the browser.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-guilds',
	route: 'guilds',
	methods: ['GET', 'OPTIONS']
})
export class ApiGuildsRoute extends Route {
	public override run(_request: ApiRequest, response: ApiResponse) {
		// Allow the static website (any origin) to fetch this public directory.
		// Runs after plugin-api's headers middleware, so this overrides its
		// single-origin default for this route only.
		response.setHeader('Access-Control-Allow-Origin', '*');
		response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
		response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		response.setHeader('Cache-Control', 'public, max-age=300');

		if (_request.method === 'OPTIONS') {
			return response.status(204).end();
		}

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
