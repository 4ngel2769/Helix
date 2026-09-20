import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { type Guild } from 'discord.js';
import { getTriggerTypeName, installPresetRules } from '../../lib/utils/automodHelpers';
import { isSnowflake, readJsonBody, readQueryParam, requireAuth, requireManageableGuild } from '../../lib/utils/apiAuth';

const PRESETS = ['low', 'medium', 'high'] as const;

/**
 * Discord native AutoMod rules for a guild (the same rules /automod manages).
 * GET lists { id, name, trigger, enabled }.
 * POST { action: 'install', preset: low|medium|high, logChannelId? } installs a preset.
 * DELETE ?ruleId= removes one rule.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-guild-automod-rules',
	route: 'guilds/[guildId]/automod-rules',
	methods: ['GET', 'POST', 'DELETE']
})
export class ApiGuildAutomodRulesRoute extends Route {
	private guildOrNull(guildId: string): Guild | null {
		return this.container.client.guilds.cache.get(guildId) ?? null;
	}

	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;

		const { guildId } = request.params as { guildId?: string };
		if (!guildId || !isSnowflake(guildId)) return response.status(400).json({ error: 'Invalid guildId parameter' });

		const manageable = requireManageableGuild(auth, guildId, response);
		if (!manageable) return undefined;

		const guild = this.guildOrNull(guildId);
		if (!guild) return response.status(404).json({ error: 'Bot is not in that server' });

		if (request.method === 'GET') {
			try {
				const rules = await guild.autoModerationRules.fetch();
				return response.json({
					guildId,
					rules: [...rules.values()].map((r) => ({
						id: r.id,
						name: r.name,
						trigger: getTriggerTypeName(r.triggerType),
						enabled: r.enabled
					}))
				});
			} catch {
				return response.status(500).json({ error: 'Failed to list AutoMod rules (needs Manage Server permission)' });
			}
		}

		if (request.method === 'POST') {
			const body = await readJsonBody<Record<string, unknown>>(request);
			if (body.action !== 'install') return response.status(400).json({ error: "Body must be { action: 'install', preset, logChannelId? }" });
			const preset = typeof body.preset === 'string' ? body.preset : '';
			if (!(PRESETS as readonly string[]).includes(preset)) {
				return response.status(400).json({ error: 'preset must be low, medium or high' });
			}
			const logChannelId = body.logChannelId ?? undefined;
			if (logChannelId !== undefined && (typeof logChannelId !== 'string' || !isSnowflake(logChannelId))) {
				return response.status(400).json({ error: 'logChannelId must be a Discord channel id' });
			}
			try {
				const result = await installPresetRules(guild, preset, guildId, logChannelId, `Preset ${preset} install via dashboard`);
				return response.json({ guildId, ...result });
			} catch {
				return response.status(500).json({ error: 'Failed to install preset (needs Manage Server permission)' });
			}
		}

		// DELETE ?ruleId=
		const ruleId = readQueryParam(request, 'ruleId');
		if (!ruleId) return response.status(400).json({ error: 'ruleId query param is required' });
		try {
			await guild.autoModerationRules.delete(ruleId, 'Deleted via dashboard');
			return response.json({ guildId, deleted: ruleId });
		} catch {
			return response.status(404).json({ error: 'Rule not found or could not be deleted' });
		}
	}
}
