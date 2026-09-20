import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { Guild } from '../../models/Guild';
import { GuildConfigService } from '../../lib/services/GuildConfigService';
import { clearGuildPrefixCache, setGuildPrefixInCache } from '../../lib/utils/prefixCache';
import { clearDisabledCommandsCache } from '../../lib/utils/disabledCommandsCache';
import { LOG_EVENT_KEYS } from '../../lib/logging/logEvents';
import { cleanAutomodKeywords, cleanNullableText, cleanWarnSettings, isHexColor, isSafeImageUrl, sanitizeText } from '../../lib/utils/sanitize';
import { CARD_BACKGROUNDS, CARD_LAYOUTS, withCardDefaults } from '../../lib/cards/cardBackgrounds';
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
	'logChannelId',
	'logEvents',
	'logEventChannels',
	'logIgnoredUsers',
	'logIgnoredRoles',
	'logIgnoredChannels',
	'logIncludeBots',
	'verificationChannelId',
	'verificationRoleId',
	'verificationMessage',
	'verificationDisabledMessage',
	'verificationTitle',
	'verificationFooter',
	'verificationThumb',
	'automodKeywords',
	'warnSettings',
	'welcomeCard',
	'farewellCard'
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

function validateConfigUpdate(update: Record<string, unknown>, isPremium: boolean): string | null {
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
		const err = cleanAutomodKeywords(update);
		if (err) return err;
	}
	if ('warnSettings' in update) {
		const err = cleanWarnSettings(update);
		if (err) return err;
	}
	for (const [key, max] of [
		['welcomeMessage', 2000],
		['farewellMessage', 2000],
		['verificationTitle', 256],
		['verificationMessage', 2000],
		['verificationDisabledMessage', 1000],
		['verificationFooter', 500]
	] as const) {
		const err = cleanNullableText(update, key, max);
		if (err) return err;
	}
	if ('verificationThumb' in update && update.verificationThumb !== null && update.verificationThumb !== undefined) {
		const thumb = update.verificationThumb;
		if (typeof thumb !== 'string' || (thumb !== '' && !isSafeImageUrl(thumb))) {
			return 'verificationThumb must be null or an http(s) image URL';
		}
		if (typeof thumb === 'string') update.verificationThumb = thumb.trim();
	}
	if ('logEvents' in update) {
		const v = update.logEvents as Record<string, unknown> | null;
		if (v === null || typeof v !== 'object' || Array.isArray(v)) return 'logEvents must be an object';
		for (const [k, val] of Object.entries(v)) {
			if (!LOG_EVENT_KEYS.includes(k)) return `logEvents has unknown event: ${k}`;
			if (typeof val !== 'boolean') return `logEvents[${k}] must be a boolean`;
		}
	}
	if ('logEventChannels' in update) {
		const v = update.logEventChannels as Record<string, unknown> | null;
		if (v === null || typeof v !== 'object' || Array.isArray(v)) return 'logEventChannels must be an object';
		for (const [k, val] of Object.entries(v)) {
			if (!LOG_EVENT_KEYS.includes(k)) return `logEventChannels has unknown event: ${k}`;
			if (typeof val !== 'string' || (val !== '' && !isSnowflake(val))) return `logEventChannels[${k}] must be a channel id or empty`;
		}
	}
	for (const field of ['logIgnoredUsers', 'logIgnoredRoles', 'logIgnoredChannels'] as const) {
		if (field in update) {
			const arr = readStringArray({ v: update[field] }, 'v');
			if (!arr || arr.length > 500 || !arr.every(isSnowflake)) return `${field} must be an array of up to 500 Discord ids`;
			update[field] = [...new Set(arr)];
		}
	}
	if ('logIncludeBots' in update && typeof update.logIncludeBots !== 'boolean') {
		return 'logIncludeBots must be a boolean';
	}
	for (const key of ['welcomeCard', 'farewellCard'] as const) {
		if (key in update) {
			const err = cleanGreetCard(update, key, isPremium);
			if (err) return err;
		}
	}
	return null;
}

function cleanGreetCard(update: Record<string, unknown>, key: 'welcomeCard' | 'farewellCard', isPremium: boolean): string | null {
	const v = update[key];
	if (typeof v !== 'object' || v === null || Array.isArray(v)) return `${key} must be an object`;
	const rec = v as Record<string, unknown>;
	const merged = withCardDefaults(rec);
	if (typeof rec.enabled !== 'boolean') return `${key}.enabled must be a boolean`;
	if (typeof rec.background !== 'string' || !CARD_BACKGROUNDS.some((b) => b.key === rec.background)) {
		return `${key}.background must be one of: ${CARD_BACKGROUNDS.map((b) => b.key).join(', ')}`;
	}
	const bg = CARD_BACKGROUNDS.find((b) => b.key === rec.background)!;
	if (bg.premium && !isPremium) return `${key}.background "${bg.key}" requires premium`;
	if (typeof rec.layout !== 'string' || !(CARD_LAYOUTS as readonly string[]).includes(rec.layout)) {
		return `${key}.layout must be left, center or right`;
	}
	for (const flag of ['showName', 'line1Enabled', 'line2Enabled'] as const) {
		if (typeof rec[flag] !== 'boolean') return `${key}.${flag} must be a boolean`;
	}
	for (const line of ['line1', 'line2'] as const) {
		const clean = sanitizeText(rec[line], 140);
		if (clean === null) return `${key}.${line} must be text up to 140 chars`;
		rec[line] = clean;
	}
	if (!isHexColor(rec.textColor)) return `${key}.textColor must be a #rrggbb hex color`;
	update[key] = { ...merged, ...rec };
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

		let isPremium = false;
		try {
			isPremium = (await Guild.findOne({ guildId }, { isPremium: 1 }).lean())?.isPremium === true;
		} catch {
			isPremium = false;
		}
		const validationError = validateConfigUpdate(update, isPremium);
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

