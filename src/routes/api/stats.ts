import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { version } from '../../../package.json';

function countCommands(client: any): number {
	try {
		const store = client.stores?.get?.('commands');
		if (store?.size) return store.size;
	} catch {
		// ignore
	}
	return 0;
}

@ApplyOptions<RouteOptions>({
	name: 'api-stats',
	route: 'stats',
	methods: ['GET']
})
export class ApiStatsRoute extends Route {
	public override run(_request: ApiRequest, response: ApiResponse) {
		const client: any = this.container.client;
		const memory = process.memoryUsage();

		return response.json({
			version,
			bot: {
				username: client.user?.username ?? 'Helix',
				id: client.user?.id ?? null
			},
			guilds: client.guilds.cache.size,
			users: client.users.cache.size,
			channels: client.channels.cache.size,
			commands: countCommands(client),
			modules: client.modules?.size ?? 0,
			uptimeMs: client.uptime ?? 0,
			memory: {
				heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
				heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
				rssMb: Math.round(memory.rss / 1024 / 1024)
			}
		});
	}
}
