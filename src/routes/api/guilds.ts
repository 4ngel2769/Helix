import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { setPublicApiHeaders } from '../../lib/utils/publicApiCors';

/**
 * Public, sanitised guild directory for the Helix website marquee
 * (name + icon) and the `helix_public_guilds` MCP tool.
 * Only exposes what any server-listing site shows: id, name,
 * approximate member count and the public CDN icon URL.
 *
 * Query parameters:
 * - `icons=only` — drop guilds without an icon. The website asks for this so
 *   every card it renders has a real server avatar.
 * - `limit=<n>` — cap the number of guilds returned (1–60, default 60).
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
	public override run(request: ApiRequest, response: ApiResponse) {
		setPublicApiHeaders(response);

		if (request.method === 'OPTIONS') {
			return response.status(204).end();
		}

		const iconQuery = Array.isArray(request.query.icons) ? request.query.icons[0] : request.query.icons;
		const iconsOnly = ['1', 'true', 'only', 'required'].includes(String(iconQuery ?? '').toLowerCase());

		const limitQuery = Array.isArray(request.query.limit) ? request.query.limit[0] : request.query.limit;
		const parsedLimit = Number.parseInt(String(limitQuery ?? ''), 10);
		const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 60) : 60;

		const guilds = [...this.container.client.guilds.cache.values()]
			.map((guild) => ({
				id: guild.id,
				name: guild.name,
				memberCount: guild.memberCount ?? guild.approximateMemberCount ?? 0,
				icon: guild.iconURL({ size: 128 })
			}))
			.filter((guild) => !iconsOnly || guild.icon !== null)
			.sort((a, b) => b.memberCount - a.memberCount)
			.slice(0, limit);

		return response.json({
			// Every guild the bot is in, including ones without an icon.
			total: this.container.client.guilds.cache.size,
			guilds
		});
	}
}
