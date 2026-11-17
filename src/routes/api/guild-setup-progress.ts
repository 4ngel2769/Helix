import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { Guild } from '../../models/Guild';
import { DEFAULT_DASHBOARD_SETUP_PROGRESS, validateDashboardSetupProgress, validateDashboardSetupProgressPatch } from '../../lib/utils/setupProgress';
import { isSnowflake, readJsonBody, requireAuth, requireManageableGuild } from '../../lib/utils/apiAuth';

@ApplyOptions<RouteOptions>({ name: 'api-guild-setup-progress', route: 'guilds/[guildId]/setup-progress', methods: ['GET', 'PATCH'] })
export class GuildSetupProgressRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return;
		const guildId = request.params.guildId;
		if (!guildId || !isSnowflake(guildId)) return response.status(400).json({ error: 'Invalid guildId parameter' });
		if (!requireManageableGuild(auth, guildId, response)) return;

		try {
			if (request.method === 'GET') {
				const guild = await Guild.findOne({ guildId }).select('dashboardSetupProgress').lean();
				const progress = guild?.dashboardSetupProgress ? validateDashboardSetupProgress(guild.dashboardSetupProgress) : null;
				return response.json({ progress: progress ?? DEFAULT_DASHBOARD_SETUP_PROGRESS });
			}

			if (request.method !== 'PATCH') return response.status(405).json({ error: 'Method not allowed' });
			const body = await readJsonBody<Record<string, unknown>>(request);
			const patch = validateDashboardSetupProgressPatch(body);
			if (!patch) return response.status(400).json({ error: 'Invalid setup progress patch' });
			const existing = await Guild.findOne({ guildId }).select('dashboardSetupProgress').lean();
			const current = existing?.dashboardSetupProgress ? validateDashboardSetupProgress(existing.dashboardSetupProgress) : null;
			const progress = validateDashboardSetupProgress({
				...(current ?? DEFAULT_DASHBOARD_SETUP_PROGRESS),
				...patch,
				...(patch.skippedSteps ? { skippedSteps: [...new Set([...(current?.skippedSteps ?? []), ...patch.skippedSteps])] } : {}),
				...(patch.acknowledgedSteps ? { acknowledgedSteps: [...new Set([...(current?.acknowledgedSteps ?? []), ...patch.acknowledgedSteps])] } : {})
			});
			if (!progress) return response.status(400).json({ error: 'Invalid setup progress patch' });
			await Guild.updateOne({ guildId }, { $set: { dashboardSetupProgress: progress } }, { upsert: true });
			return response.json({ progress });
		} catch (error) {
			this.container.logger.error('Failed to load or save dashboard setup progress', error);
			return response.status(500).json({ error: 'Failed to update setup progress' });
		}
	}
}
