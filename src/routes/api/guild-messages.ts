import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { CustomMessage } from '../../models/customMessages';
import { isSnowflake, readJsonBody, requireAuth, requireManageableGuild } from '../../lib/utils/apiAuth';
import { clearGuildStrings } from '../../lib/i18n/guildStrings';
import { KEYS, PLACEHOLDER_DOC } from '../../lib/i18n';
import { validateMessages } from '../../lib/kits/validation';

/**
 * Per-guild message overrides — the highest-priority layer of the resolution
 * chain (above the active kit, above the locale catalog).
 *
 * This used to accept any `[a-z0-9-]{1,64}` key and any text up to 2000 chars,
 * and it was WRITE-ONLY: the dashboard could save here and no command ever read
 * the result. It now goes through the same validator as shared kits, so a
 * moderator typing `@everyone` into this box is stopped by the same rules that
 * stop an untrusted shared kit, and `getGuildStrings` is what finally reads it.
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
			return response.json({
				guildId,
				messages: doc?.messages ?? {},
				// The editor needs to know what it is allowed to send, otherwise
				// the placeholder hint and the validator drift apart.
				availableKeys: [...KEYS],
				placeholders: PLACEHOLDER_DOC
			});
		}

		const body = await readJsonBody<Record<string, unknown>>(request);
		const parsed = validateMessages(body.messages);
		if (!parsed.ok) return response.status(400).json({ error: 'Invalid messages', errors: parsed.errors });

		// An empty string deletes the override (falls back to the kit/locale).
		const removals = Object.entries(body.messages as Record<string, unknown>)
			.filter(([, value]) => value === null || value === undefined || value === '')
			.map(([key]) => key);
		const setOps: Record<string, string> = {};
		for (const [key, value] of Object.entries(parsed.messages)) setOps[`messages.${key}`] = value;

		try {
			const unsetOps: Record<string, ''> = {};
			for (const key of removals) unsetOps[`messages.${key}`] = '';
			await CustomMessage.findOneAndUpdate({ guildId }, { $set: setOps, $unset: unsetOps }, { upsert: true });
			clearGuildStrings(guildId);
			const doc = await CustomMessage.findOne({ guildId }).lean();
			return response.json({ guildId, updated: Object.keys(parsed.messages), removed: removals, messages: doc?.messages ?? {} });
		} catch {
			return response.status(500).json({ error: 'Failed to update custom messages' });
		}
	}
}
