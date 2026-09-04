import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { isSnowflake, readJsonBody, readString, requireAuth, requireManageableGuild } from '../../lib/utils/apiAuth';

type ModerationAction = 'timeout' | 'untimeout' | 'kick' | 'ban' | 'unban' | 'clearMessages';

const ACTIONS: ModerationAction[] = ['timeout', 'untimeout', 'kick', 'ban', 'unban', 'clearMessages'];

/**
 * Execute live moderation actions in a guild.
 * POST { action, userId, reason?, durationMinutes?, messageLimit? }
 */
@ApplyOptions<RouteOptions>({
	name: 'api-guild-moderation',
	route: 'guilds/[guildId]/moderation',
	methods: ['POST']
})
export class ApiGuildModerationRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;

		const { guildId } = request.params as { guildId?: string };
		if (!guildId || !isSnowflake(guildId)) return response.status(400).json({ error: 'Invalid guildId parameter' });

		const manageable = requireManageableGuild(auth, guildId, response);
		if (!manageable) return undefined;

		const body = await readJsonBody<Record<string, unknown>>(request);
		const action = typeof body.action === 'string' ? body.action : null;
		const targetUserId = typeof body.userId === 'string' ? body.userId : null;
		const reason = readString({ reason: body.reason ?? `API moderation action (${action})` }, 'reason', 512) ?? 'API moderation action';
		if (!action || !ACTIONS.includes(action as ModerationAction)) {
			return response.status(400).json({ error: `action is required. Allowed: ${ACTIONS.join(', ')}` });
		}
		if (!targetUserId || !isSnowflake(targetUserId)) return response.status(400).json({ error: 'userId (snowflake) is required' });
		const durationMinutes = typeof body.durationMinutes === 'number' ? body.durationMinutes : 10;

		const guild = this.container.client.guilds.cache.get(guildId);
		if (!guild) return response.status(409).json({ error: 'BotNotInGuild' });

		try {
			switch (action as ModerationAction) {
				case 'timeout': {
					const minutes = Math.min(Math.max(durationMinutes, 1), 40320);
					const member = await guild.members.fetch(targetUserId);
					await member.timeout(minutes * 60 * 1000, reason);
					return response.json({ guildId, action: 'timeout', userId: targetUserId, durationMinutes: minutes });
				}
				case 'untimeout': {
					const member = await guild.members.fetch(targetUserId);
					await member.timeout(null, reason);
					return response.json({ guildId, action: 'untimeout', userId: targetUserId });
				}
				case 'kick': {
					const member = await guild.members.fetch(targetUserId);
					await member.kick(reason);
					return response.json({ guildId, action: 'kick', userId: targetUserId });
				}
				case 'ban': {
					await guild.members.ban(targetUserId, { reason });
					return response.json({ guildId, action: 'ban', userId: targetUserId });
				}
				case 'unban': {
					await guild.members.unban(targetUserId, reason);
					return response.json({ guildId, action: 'unban', userId: targetUserId });
				}
				case 'clearMessages': {
					const member = await guild.members.fetch(targetUserId).catch(() => null);
					if (!member) return response.status(404).json({ error: 'Member not found in guild' });
					// Bulk-delete recent messages from the user across recent text channels is not
					// exposed as a single Discord call; report the supported path instead.
					return response.status(501).json({
						error: 'Use channel-scoped purge commands for message deletion. Provide channelId via the dashboard bot commands.'
					});
				}
				default:
					return response.status(400).json({ error: 'Unknown action' });
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Moderation action failed';
			const status = /missing (access|permissions)/i.test(message) ? 403 : 500;
			return response.status(status).json({ error: message });
		}
	}
}

