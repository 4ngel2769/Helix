import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { CustomMessage } from '../../models/customMessages';
import { readBody, requireAuth, requireManageableGuild } from '../../lib/utils/apiAuth';

/**
 * Custom per-guild messages (welcome/farewell variants, command replies...).
 * GET returns all; PATCH merges the provided keys.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-guild-messages',
	route: 'guilds/[guildId]/messages',
	methods: ['GET', 'PATCH']
})
export class ApiGuildMessagesRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;

		const { guildId } = request.params as { guildId?: string };
		if (!guildId) return response.status(400).json({ error: 'Missing guildId parameter' });

		const manageable = requireManageableGuild(auth, guildId, response);
		if (!manageable) return undefined;

		if (request.method === 'GET') {
			const doc = await CustomMessage.findOne({ guildId }).lean();
			return response.json({ guildId, messages: doc?.messages ?? {} });
		}

		const body = readBody<{ messages?: Record<string, string> }>(request);
		if (!body.messages || typeof body.messages !== 'object') {
			return response.status(400).json({ error: 'Body must be { messages: { <key>: <text> } }' });
		}
		for (const [key, value] of Object.entries(body.messages)) {
			if (typeof value !== 'string' || value.length > 2000) {
				return response.status(400).json({ error: `Message "${key}" must be a string of max 2000 chars` });
			}
		}

		try {
			const setOps: Record<string, string> = {};
			for (const [key, value] of Object.entries(body.messages)) {
				setOps[`messages.${key}`] = value;
			}
			const doc = await CustomMessage.findOneAndUpdate({ guildId }, { $set: setOps }, { upsert: true, returnDocument: 'after' }).lean();
			return response.json({ guildId, updated: Object.keys(body.messages), messages: doc?.messages ?? {} });
		} catch {
			return response.status(500).json({ error: 'Failed to update custom messages' });
		}
	}
}

