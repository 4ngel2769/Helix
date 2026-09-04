import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { LeaderboardService } from '../../lib/services/economy/LeaderboardService';
import { readQueryParam } from '../../lib/utils/apiAuth';

type LeaderboardType = 'wallet' | 'bank' | 'total' | 'level';

/**
 * GET /economy/leaderboard?type=total&limit=10
 */
@ApplyOptions<RouteOptions>({
	name: 'api-economy-leaderboard',
	route: 'economy/leaderboard',
	methods: ['GET']
})
export class ApiEconomyLeaderboardRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const rawType = (readQueryParam(request, 'type') ?? 'total').toLowerCase();
		const allowed: LeaderboardType[] = ['wallet', 'bank', 'total', 'level'];
		if (!allowed.includes(rawType as LeaderboardType)) {
			return response.status(400).json({ error: `type must be one of: ${allowed.join(', ')}` });
		}
		const limit = Math.min(Math.max(parseInt(readQueryParam(request, 'limit') ?? '10', 10) || 10, 1), 100);

		try {
			const users = await LeaderboardService.getLeaderboard(rawType as LeaderboardType, limit);
			const entries = users.map((u: any, index: number) => ({
				rank: index + 1,
				userId: u.userId ?? u._id ?? null,
				username: u.username ?? null,
				wallet: u.economy?.wallet ?? 0,
				bank: u.economy?.bank ?? 0,
				total: (u.economy?.wallet ?? 0) + (u.economy?.bank ?? 0),
				level: u.economy?.level ?? 1,
				experience: u.economy?.experience ?? 0
			}));

			return response.json({ type: rawType, total: entries.length, entries });
		} catch {
			return response.status(500).json({ error: 'Failed to load leaderboard' });
		}
	}
}
