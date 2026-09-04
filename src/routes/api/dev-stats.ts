import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { version } from '../../../package.json';
import { User } from '../../models/User';
import { Guild } from '../../models/Guild';
import { Auction } from '../../models/Auction';
import { EconomyItem } from '../../models/EconomyItem';
import { requireAuth, requireDev } from '../../lib/utils/apiAuth';

/**
 * Dev-only: bot internals + database totals.
 * Requires OWNER_IDS membership — normal users and server managers get 403.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-dev-stats',
	route: 'dev/stats',
	methods: ['GET']
})
export class ApiDevStatsRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;
		const dev = await requireDev(auth, response);
		if (!dev) return undefined;

		try {
			const client: any = this.container.client;
			const memory = process.memoryUsage();
			const [users, guildDocs, activeAuctions, items, commands] = await Promise.all([
				User.countDocuments().catch(() => -1),
				Guild.countDocuments().catch(() => -1),
				Auction.countDocuments({ status: 'active' }).catch(() => -1),
				EconomyItem.countDocuments().catch(() => -1),
				(async () => {
					try {
						const store = client.stores?.get?.('commands');
						return store?.size ?? 0;
					} catch {
						return 0;
					}
				})()
			]);

			return response.json({
				version,
				bot: { username: client.user?.username ?? 'Helix', id: client.user?.id ?? null },
				uptimeMs: client.uptime ?? 0,
				discord: {
					guilds: client.guilds.cache.size,
					users: client.users.cache.size,
					channels: client.channels.cache.size
				},
				commands,
				modules: client.modules?.size ?? 0,
				database: { users, guildDocs, activeAuctions, items },
				memory: {
					heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
					heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
					rssMb: Math.round(memory.rss / 1024 / 1024)
				}
			});
		} catch {
			return response.status(500).json({ error: 'Failed to load dev stats' });
		}
	}
}
