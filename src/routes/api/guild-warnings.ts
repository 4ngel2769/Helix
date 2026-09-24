import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { User } from '../../models/User';
import { ModerationService } from '../../lib/services/ModerationService';
import { getTokenUserId, isSnowflake, readJsonBody, readQueryParam, readString, requireAuth, requireManageableGuild } from '../../lib/utils/apiAuth';
import { sanitizeText } from '../../lib/utils/sanitize';

/**
 * Moderation warnings (stored on the User document, scoped by guildId).
 * GET lists (?userId= filter, ?activeOnly=false). POST creates. DELETE clears one (?warningId=).
 */
@ApplyOptions<RouteOptions>({
	name: 'api-guild-warnings',
	route: 'guilds/[guildId]/warnings',
	methods: ['GET', 'POST', 'DELETE']
})
export class ApiGuildWarningsRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;

		const { guildId } = request.params as { guildId?: string };
		if (!guildId || !isSnowflake(guildId)) return response.status(400).json({ error: 'Invalid guildId parameter' });

		const manageable = requireManageableGuild(auth, guildId, response);
		if (!manageable) return undefined;

		if (request.method === 'GET') {
			const userId = readQueryParam(request, 'userId');
			if (userId && !isSnowflake(userId)) return response.status(400).json({ error: 'Invalid userId parameter' });
			const activeOnly = readQueryParam(request, 'activeOnly') !== 'false';
			try {
				const match: Record<string, unknown> = { 'warnings.guildId': guildId };
				if (userId) match['userId'] = userId;
				const users = await User.find(match, { userId: 1, username: 1, warnings: 1 }).lean();
				const warnings = users.flatMap((u) =>
					(u.warnings ?? [])
						.filter((w) => w.guildId === guildId && (!activeOnly || w.active))
						.map((w) => ({ ...w, userId: u.userId, username: u.username }))
				);
				return response.json({ guildId, total: warnings.length, warnings });
			} catch {
				return response.status(500).json({ error: 'Failed to load warnings' });
			}
		}

		if (request.method === 'POST') {
			const body = await readJsonBody<Record<string, unknown>>(request);
			const targetUserId = readString(body, 'userId', 32);
			const reason = sanitizeText(body.reason, 1000);
			if (!targetUserId || !isSnowflake(targetUserId) || !reason) {
				return response.status(400).json({ error: 'userId (snowflake) and reason (1-1000 chars) are required' });
			}
			try {
				const moderatorId = await getTokenUserId(auth.token);
				if (!moderatorId) return response.status(401).json({ error: 'Unable to resolve dashboard user' });
				const result = await ModerationService.createWarning({
					guildId,
					userId: targetUserId,
					reason,
					moderatorId,
					moderatorTag: `Dashboard ${moderatorId}`,
					source: 'api'
				});
				return response.status(201).json({ guildId, warning: { ...result.warning, userId: targetUserId }, activeCount: result.activeCount, escalation: result.escalation });
			} catch {
				return response.status(500).json({ error: 'Failed to create warning' });
			}
		}

		// DELETE ?warningId=<subdoc _id>&userId=<owner> (scoped to this guild)
		const warningId = readQueryParam(request, 'warningId');
		const userId = readQueryParam(request, 'userId');
		if (!warningId || !userId || !isSnowflake(userId)) {
			return response.status(400).json({ error: 'warningId and userId (snowflake) query params are required' });
		}
		try {
			const moderatorId = await getTokenUserId(auth.token);
			if (!moderatorId) return response.status(401).json({ error: 'Unable to resolve dashboard user' });
			const cleared = await ModerationService.clearWarning(guildId, userId, warningId, moderatorId);
			if (!cleared) return response.status(404).json({ error: 'Warning not found' });
			return response.json({ guildId, cleared: warningId });
		} catch {
			return response.status(500).json({ error: 'Failed to clear warning' });
		}
	}
}

