import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { Guild } from '../../models/Guild';
import { GuildConfigService } from '../../lib/services/GuildConfigService';
import { clearGuildPrefixCache, setGuildPrefixInCache } from '../../lib/utils/prefixCache';
import { clearDisabledCommandsCache } from '../../lib/utils/disabledCommandsCache';
import { LOG_EVENT_KEYS } from '../../lib/logging/logEvents';
import { isPremiumActive } from '../../lib/utils/premium';
import {
	cleanAutomodKeywords,
	cleanAutomodSettings,
	cleanLeveling,
	cleanNullableText,
	cleanWarnSettings,
	isSafeImageUrl
} from '../../lib/utils/sanitize';
import { validateGreetCard } from '../../lib/cards/cardValidation';
import { clearGuildAutomation } from '../../lib/utils/guildAutomationCache';
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
	'banMessage',
	'joinDmMessage',
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
	'automodSettings',
	'leveling',
	'warnSettings',
	'welcomeCard',
	'farewellCard'
] as const;

type UpdatableField = (typeof UPDATABLE_FIELDS)[number];

function publicConfig(data: unknown): unknown {
	const value = data && typeof data === 'object' && 'toObject' in data && typeof data.toObject === 'function' ? data.toObject() : data;
	if (!value || typeof value !== 'object') return value;
	const { setupWizard: _setupWizard, ...config } = value as Record<string, unknown>;
	return config;
}

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
	if ('automodSettings' in update) {
		const err = cleanAutomodSettings(update);
		if (err) return err;
	}
	if ('leveling' in update) {
		const err = cleanLeveling(update);
		if (err) return err;
	}
	if ('warnSettings' in update) {
		const err = cleanWarnSettings(update);
		if (err) return err;
	}
	for (const [key, max] of [
		['welcomeMessage', 2000],
		['farewellMessage', 2000],
		['banMessage', 2000],
		['joinDmMessage', 2000],
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
	const { card, error } = validateGreetCard(update[key], { allowPremium: isPremium });
	if (error) return `${key}: ${error}`;
	update[key] = card;
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
				return response.json({ guildId, config: publicConfig(data) });
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
			isPremium = isPremiumActive(await Guild.findOne({ guildId }, { isPremium: 1, premiumExpiresAt: 1 }).lean());
		} catch {
			isPremium = false;
		}
		const validationError = validateConfigUpdate(update, isPremium);
		if (validationError) return response.status(400).json({ error: validationError });
		const guild = this.container.client.guilds.cache.get(guildId);
		for (const field of ['adminRoleId', 'modRoleId', 'muteRoleId', 'autoroleId'] as const) {
			if (!(field in update) || update[field] === null) continue;
			const roleId = update[field] as string;
			const role = guild?.roles.cache.get(roleId);
			if (!guild || roleId === guild.roles.everyone.id || role?.managed) {
				return response.status(400).json({ error: `${field} cannot be the @everyone role or a managed integration role` });
			}
		}

		try {
			const data = await Guild.findOneAndUpdate({ guildId }, { $set: update }, { upsert: true, returnDocument: 'after' });
			if ('prefix' in update) {
				if (typeof update.prefix === 'string') setGuildPrefixInCache(guildId, update.prefix);
				else clearGuildPrefixCache(guildId);
			}
			if ('disabledCommands' in update) clearDisabledCommandsCache(guildId);
			if ('leveling' in update || 'automodSettings' in update || 'modules' in update || 'adminRoleId' in update || 'modRoleId' in update || 'muteRoleId' in update) clearGuildAutomation(guildId);
			return response.json({ guildId, updated: Object.keys(update), config: publicConfig(data) });
		} catch {
			return response.status(500).json({ error: 'Failed to update guild config' });
		}
	}
}
