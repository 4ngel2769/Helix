import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { version } from '../../../package.json';

@ApplyOptions<RouteOptions>({
	name: 'api-health',
	route: 'health',
	methods: ['GET']
})
export class ApiHealthRoute extends Route {
	public override async run(_request: ApiRequest, response: ApiResponse) {
		let database = 'unknown';
		try {
			const mongoose = (await import('mongoose')).default;
			database = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
		} catch {
			database = 'unknown';
		}

		return response.json({
			status: 'ok',
			version,
			uptimeSeconds: Math.floor((this.container.client.uptime ?? 0) / 1000),
			guilds: this.container.client.guilds.cache.size,
			database,
			timestamp: new Date().toISOString()
		});
	}
}
