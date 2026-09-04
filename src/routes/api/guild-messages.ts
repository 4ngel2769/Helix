import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { CustomMessage } from '../../models/customMessages';
import { isSnowflake, readBody, requireAuth, requireManageableGuild } from '../../lib/utils/apiAuth';

const KEY_PATTERN = /^[a-z0-9-]{1,64}$/;

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
		if (!guildId || !isSnowflake(guildId)) return response.status(400).json({ error: 'Invalid guildId parameter' });

		const manageable = requireManageableGuild(auth, guildId, response);
		if (!manageable) return undefined;

		if (request.method === 'GET') {
			const doc = await CustomMessage.findOne({ guildId }).lean();
			return response.json({ guildId, messages: doc?.messages ?? {} });
		}

		const body = readBody<Record<string, unknown>>(request);
		if (!body.messages || typeof body.messages !== 'object' || Array.isArray(body.messages)) {
			return response.status(400).json({ error: 'Body must be { messages: { <key>: <text> } }' });
		}
		const entries = Object.entries(body.messages as Record<string, unknown>);
		if (entries.length === 0 || entries.length > 50) {
			return response.status(400).json({ error: 'Provide between 1 and 50 messages per request' });
		}
		for (const [key, value] of entries) {
			if (!KEY_PATTERN.test(key)) {
				return response.status(400).json({ error: `Message key "${key.slice(0, 32)}" must match [a-z0-9-]{1,64}` });
			}
			if (typeof value !== 'string' || value.length === 0 || value.length > 2000) {
				return response.status(400).json({ error: `Message "${key}" must be a string of 1-2000 chars` });
			}
		}

		try {
			const setOps: Record<string, string> = {};
			for (const [key, value] of entries) {
				setOps[`messages.${key}`] = value as string;
			}
			const doc = await CustomMessage.findOneAndUpdate({ guildId }, { $set: setOps }, { upsert: true, returnDocument: 'after' }).lean();
			return response.json({ guildId, updated: entries.map(([k]) => k), messages: doc?.messages ?? {} });
		} catch {
			return response.status(500).json({ error: 'Failed to update custom messages' });
		}
	}
}

