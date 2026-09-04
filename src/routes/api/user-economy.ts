import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { User } from '../../models/User';
import { isSnowflake, readQueryParam } from '../../lib/utils/apiAuth';

/**
 * Public user economy profile.
 * Private profiles (settings.publicProfile=false) only expose identity + level.
 * GET /users/[userId]/economy?inventoryLimit=20
 */
@ApplyOptions<RouteOptions>({
	name: 'api-user-economy',
	route: 'users/[userId]/economy',
	methods: ['GET']
})
export class ApiUserEconomyRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const { userId } = request.params as { userId?: string };
		if (!userId || !isSnowflake(userId)) return response.status(400).json({ error: 'Invalid userId parameter' });

		try {
			const user = await User.findOne({ userId }).lean();
			if (!user) return response.status(404).json({ error: 'User not found' });

			const discordUser = this.container.client.users.cache.get(userId);
			const identity = {
				userId: user.userId,
				username: discordUser?.username ?? user.username,
				avatar: discordUser?.displayAvatarURL({ size: 128 }) ?? null
			};

			if (user.economy?.settings?.publicProfile === false) {
				return response.json({ ...identity, private: true });
			}

			const inventoryLimit = Math.min(Math.max(parseInt(readQueryParam(request, 'inventoryLimit') ?? '20', 10) || 20, 0), 100);
			const inventory = (user.economy?.inventory ?? []).slice(0, inventoryLimit);

			return response.json({
				...identity,
				private: false,
				wallet: user.economy?.wallet ?? 0,
				bank: user.economy?.bank ?? 0,
				bankLimit: user.economy?.bankLimit ?? 0,
				total: (user.economy?.wallet ?? 0) + (user.economy?.bank ?? 0),
				level: user.economy?.level ?? 1,
				experience: user.economy?.experience ?? 0,
				dailyStreak: user.economy?.dailyStreak ?? 0,
				inventoryTotal: user.economy?.inventory?.length ?? 0,
				inventory,
				equipment: user.economy?.equipment ?? {},
				stats: user.economy?.stats ?? null,
				achievements: user.economy?.achievements ?? []
			});
		} catch {
			return response.status(500).json({ error: 'Failed to load user economy' });
		}
	}
}

