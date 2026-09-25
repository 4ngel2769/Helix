import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { GuildXp } from '../../models/GuildXp';
import { progressToNext } from '../../lib/utils/leveling';
import { isSnowflake, readQueryParam, requireAuth, requireManageableGuild } from '../../lib/utils/apiAuth';

/**
 * Per-guild XP leaderboard.
 * GET guilds/[guildId]/leaderboard?limit=25
 */
@ApplyOptions<RouteOptions>({
	name: 'api-guild-leaderboard',
	route: 'guilds/[guildId]/leaderboard',
	methods: ['GET']
})
export class ApiGuildLeaderboardRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;

		const { guildId } = request.params as { guildId?: string };
		if (!guildId || !isSnowflake(guildId)) return response.status(400).json({ error: 'Invalid guildId parameter' });

		if (!requireManageableGuild(auth, guildId, response)) return undefined;

		const limit = Math.min(Math.max(parseInt(readQueryParam(request, 'limit') ?? '25', 10) || 25, 1), 100);
		try {
			const rows = await GuildXp.find({ guildId }).sort({ xp: -1 }).limit(limit).lean();
			const entries = rows.map((row, i) => {
				const { level, into, needed } = progressToNext(row.xp);
				return { rank: i + 1, userId: row.userId, xp: row.xp, level, into, needed };
			});
			return response.json({ guildId, total: entries.length, entries });
		} catch {
			return response.status(500).json({ error: 'Failed to load leaderboard' });
		}
	}
}
