import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { User } from '../../models/User';
import { getTokenUserId, isBotOwner, requireAuth } from '../../lib/utils/apiAuth';

/**
 * Read-only self-service data for any logged-in dashboard user.
 * Returns ONLY the caller's own stored data: identity, full economy profile,
 * warnings (with guild names), and account metadata. No mutations possible.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-me-data',
	route: 'me/data',
	methods: ['GET']
})
export class ApiMeDataRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;

		const userId = await getTokenUserId(auth.token);
		if (!userId) return response.status(401).json({ error: 'Unauthorized', message: 'Could not resolve Discord identity' });

		try {
			const user = await User.findOne({ userId }).lean();
			const discordUser = this.container.client.users.cache.get(userId);

			const identity = {
				userId,
				username: discordUser?.username ?? user?.username ?? null,
				avatar: discordUser?.displayAvatarURL({ size: 128 }) ?? null,
				isDeveloper: isBotOwner(userId)
			};

			if (!user) {
				return response.json({ ...identity, hasData: false, economy: null, warnings: [], servers: [] });
			}

			const guildName = (guildId: string): string | null =>
				this.container.client.guilds.cache.get(guildId)?.name ?? null;

			const warnings = (user.warnings ?? []).map((w) => ({
				guildId: w.guildId,
				guildName: guildName(w.guildId),
				reason: w.reason,
				moderatorTag: w.moderatorTag,
				timestamp: w.timestamp,
				active: w.active
			}));

			const inventory = user.economy?.inventory ?? [];
			return response.json({
				...identity,
				hasData: true,
				economy: {
					wallet: user.economy?.wallet ?? 0,
					bank: user.economy?.bank ?? 0,
					bankLimit: user.economy?.bankLimit ?? 0,
					total: (user.economy?.wallet ?? 0) + (user.economy?.bank ?? 0),
					level: user.economy?.level ?? 1,
					experience: user.economy?.experience ?? 0,
					dailyStreak: user.economy?.dailyStreak ?? 0,
					inventoryTotal: inventory.length,
					inventory: inventory.slice(0, 50),
					equipment: user.economy?.equipment ?? {},
					stats: user.economy?.stats ?? null,
					achievements: user.economy?.achievements ?? [],
					publicProfile: user.economy?.settings?.publicProfile ?? true
				},
				warnings,
				activeWarnings: warnings.filter((w) => w.active).length,
				servers: {
					known: user.joinedServers ?? [],
					lastSeen: user.lastSeen ?? null,
					firstSeen: user.createdAt ?? null
				}
			});
		} catch {
			return response.status(500).json({ error: 'Failed to load your data' });
		}
	}
}
