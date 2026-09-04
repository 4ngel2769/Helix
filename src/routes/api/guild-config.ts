import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { Guild } from '../../models/Guild';
import { GuildConfigService } from '../../lib/services/GuildConfigService';
import { clearGuildPrefixCache, setGuildPrefixInCache } from '../../lib/utils/prefixCache';
import { clearDisabledCommandsCache } from '../../lib/utils/disabledCommandsCache';
import { isSnowflake, readJsonBody, readStringArray, requireAuth, requireManageableGuild } from '../../lib/utils/apiAuth';

const UPDATABLE_FIELDS = [
	'prefix',
	'adminRoleId',
	'modRoleId',
	'muteRoleId',
	'autoroleId',
	'disabledCommands',
	'modLogChannelId',
	'memberLogChannelId',
	'messageEditLogChannelId',
	'messageDeleteLogChannelId',
	'nicknameLogChannelId',
	'roleLogChannelId',
	'welcomeChannelId',
	'welcomeMessage',
	'farewellChannelId',
	'farewellMessage',
	'systemChannelId',
	'verificationChannelId',
	'verificationRoleId',
	'verificationMessage',
	'verificationDisabledMessage',
	'verificationTitle',
	'verificationFooter',
	'verificationThumb',
	'automodKeywords',
	'warnSettings'
] as const;

type UpdatableField = (typeof UPDATABLE_FIELDS)[number];

function sanitizeConfigUpdate(body: Record<string, unknown>): Record<string, unknown> {
	const update: Record<string, unknown> = {};
	for (const field of UPDATABLE_FIELDS) {
		if (field in body && body[field] !== undefined) {
			update[field] = body[field];
		}
	}
	return update;
}

function validateConfigUpdate(update: Record<string, unknown>): string | null {
	if ('prefix' in update) {
		const prefix = update.prefix;
		if (prefix !== null && (typeof prefix !== 'string' || prefix.length === 0 || prefix.length > 5)) {
			return 'prefix must be null or a string of 1-5 characters';
		}
	}
	if ('disabledCommands' in update) {
		const arr = readStringArray({ v: update.disabledCommands }, 'v');
		if (!arr) return 'disabledCommands must be an array of up to 500 command names';
		update.disabledCommands = arr.map((s) => s.toLowerCase());
	}
	// All stored IDs must be null or Discord snowflakes.
	for (const field of UPDATABLE_FIELDS) {
		if (!field.endsWith('Id') && field !== 'verificationThumb') continue;
		if (!(field in update)) continue;
		const value = update[field];
		if (value !== null && (typeof value !== 'string' || (field.endsWith('Id') && !isSnowflake(value)))) {
			return `${field} must be null or a valid Discord id`;
		}
	}
	if ('automodKeywords' in update) {
		const v = update.automodKeywords as Record<string, unknown> | null;
		if (v !== null && typeof v !== 'object') return 'automodKeywords must be an object';
	}
	if ('warnSettings' in update) {
		const v = update.warnSettings as Record<string, unknown> | null;
		if (v !== null && typeof v !== 'object') return 'warnSettings must be an object';
	}
	return null;
}

/**
 * Full guild configuration (backed by the Guild mongoose model).
 * GET returns the whole config doc; PATCH updates a whitelist of fields.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-guild-config',
	route: 'guilds/[guildId]/config',
	methods: ['GET', 'PATCH']
})
export class ApiGuildConfigRoute extends Route {
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
				return response.json({ guildId, config: data });
			} catch {
				return response.status(500).json({ error: 'Failed to load guild config' });
			}
		}

		// PATCH
		const body = await readJsonBody<Record<string, unknown>>(request);
		const update = sanitizeConfigUpdate(body);
		if (Object.keys(update).length === 0) {
			return response.status(400).json({ error: `No updatable fields provided. Allowed: ${UPDATABLE_FIELDS.join(', ')}` });
		}

		const validationError = validateConfigUpdate(update);
		if (validationError) return response.status(400).json({ error: validationError });

		try {
			const data = await Guild.findOneAndUpdate({ guildId }, { $set: update }, { upsert: true, returnDocument: 'after' });
			if ('prefix' in update) {
				if (typeof update.prefix === 'string') setGuildPrefixInCache(guildId, update.prefix);
				else clearGuildPrefixCache(guildId);
			}
			if ('disabledCommands' in update) clearDisabledCommandsCache(guildId);
			return response.json({ guildId, updated: Object.keys(update), config: data });
		} catch {
			return response.status(500).json({ error: 'Failed to update guild config' });
		}
	}
}

