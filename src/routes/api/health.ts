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
	/** Set once the dashboard handshake has been acknowledged (avoids log spam). */
	private hookLogged = false;

	public override async run(request: ApiRequest, response: ApiResponse) {
		const headers = (request as unknown as { headers?: Record<string, unknown> }).headers;
		const hook = headers?.['x-helix-dashboard'];
		if (typeof hook === 'string' && hook.length > 0 && !this.hookLogged) {
			this.hookLogged = true;
			this.container.logger.info(`Dashboard linked (${hook})`);
		}

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
