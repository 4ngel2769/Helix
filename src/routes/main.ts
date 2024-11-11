import { Route } from '../lib/structures/Route';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';

@ApplyOptions<RouteOptions>({
	name: 'main',
	route: ''
})
export class MainRoute extends Route {
	public override run(_request: ApiRequest, response: ApiResponse) {
		return response.json({
			name: this.container.client.user?.username ?? 'Bot',
			version: process.env.npm_package_version ?? '1.0.0',
			modules: this.container.client.modules.size,
			servers: this.container.client.guilds.cache.size
		});
	}
}
