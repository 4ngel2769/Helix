import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { Guild } from '../../models/Guild';
import { GuildConfigService } from '../../lib/services/GuildConfigService';
import { getAllModuleKeys, getModuleConfig } from '../../config/modules';
import { isSnowflake, readJsonBody, requireAuth, requireManageableGuild } from '../../lib/utils/apiAuth';

/**
 * Per-guild module toggles.
 * GET returns current state merged with module catalog; PATCH sets flags.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-guild-modules',
	route: 'guilds/[guildId]/modules',
	methods: ['GET', 'PATCH']
})
export class ApiGuildModulesRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;

		const { guildId } = request.params as { guildId?: string };
		if (!guildId || !isSnowflake(guildId)) return response.status(400).json({ error: 'Invalid guildId parameter' });

		const manageable = requireManageableGuild(auth, guildId, response);
		if (!manageable) return undefined;

		if (request.method === 'GET') {
			try {
				const data = await GuildConfigService.getOrCreateGuildData(guildId);
				const modules = getAllModuleKeys().map((key) => {
					const cfg = getModuleConfig(key);
					return {
						key,
						name: cfg?.name ?? key,
						description: cfg?.description ?? '',
						defaultEnabled: cfg?.defaultEnabled ?? true,
						enabled: data.modules?.[key] ?? cfg?.defaultEnabled ?? true
					};
				});
				return response.json({ guildId, modules });
			} catch {
				return response.status(500).json({ error: 'Failed to load module state' });
			}
		}

		const body = await readJsonBody<{ modules?: Record<string, boolean> }>(request);
		const incoming = body.modules;
		if (!incoming || typeof incoming !== 'object') {
			return response.status(400).json({ error: 'Body must be { modules: { <key>: boolean } }' });
		}

		const validKeys = new Set(getAllModuleKeys());
		const invalid = Object.keys(incoming).filter((k) => !validKeys.has(k));
		if (invalid.length > 0) {
			return response.status(400).json({ error: `Unknown modules: ${invalid.join(', ')}. Valid: ${[...validKeys].join(', ')}` });
		}
		for (const [key, value] of Object.entries(incoming)) {
			if (typeof value !== 'boolean') {
				return response.status(400).json({ error: `Module "${key}" must be a boolean` });
			}
		}

		try {
			const setOps: Record<string, boolean> = {};
			for (const [key, value] of Object.entries(incoming)) {
				setOps[`modules.${key}`] = value;
			}
			const data = await Guild.findOneAndUpdate({ guildId }, { $set: setOps }, { upsert: true, returnDocument: 'after' });
			return response.json({ guildId, updated: incoming, modules: data?.modules ?? {} });
		} catch {
			return response.status(500).json({ error: 'Failed to update modules' });
		}
	}
}

