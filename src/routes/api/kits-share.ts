import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { MessageKit, newKitId } from '../../models/MessageKit';
import { Guild } from '../../models/Guild';
import { getTokenUserId, isSnowflake, readJsonBody, requireAuth, requireManageableGuild } from '../../lib/utils/apiAuth';
import { clearGuildStrings } from '../../lib/i18n/guildStrings';
import { isLocale } from '../../lib/i18n';
import { scrubMessages, validateMessages } from '../../lib/kits/validation';

const KIT_ID_PATTERN = /^[a-f0-9]{16}$/;

/**
 * Sharing + importing a kit, and activating one for a guild.
 *
 * The import path is the untrusted one: `kitId` comes from a URL a moderator
 * clicked, and the kit behind it was written by a stranger. Two rules make it
 * safe:
 *
 *  1. RE-VALIDATE the stored messages. Nothing trusts that a document which
 *     passed `validateKit` on the way in still passes — a kit from before a
 *     rule was tightened, or one written straight into Mongo, is checked again.
 *  2. COPY, don't reference. The import gets a fresh document owned by the
 *     importing guild, so the original author editing their kit afterwards
 *     cannot silently rewrite your server.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-kits-share',
	route: 'kits/[kitId]',
	methods: ['GET', 'POST']
})
export class ApiKitShareRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const { kitId } = request.params as { kitId?: string };
		if (!kitId || !KIT_ID_PATTERN.test(kitId)) return response.status(400).json({ error: 'Invalid kit id' });

		// The share page itself only needs to render metadata, so it does not
		// require a session. Templates are only returned to a signed-in caller.
		if (request.method === 'GET') {
			const kit = await MessageKit.findOne({ kitId }).lean();
			if (!kit) return response.status(404).json({ error: 'Kit not found' });

			const base = {
				kitId: kit.kitId,
				name: kit.name,
				description: kit.description,
				locale: kit.locale,
				authorName: kit.authorName,
				imports: kit.imports,
				updatedAt: kit.updatedAt,
				keyCount: Object.keys(Object.fromEntries((kit.messages ?? new Map()) as Map<string, string>)).length
			};

			if (!requireAuth(request, response)) return response.json({ ...base, preview: null });
			// Even read-only, serve the SCRUBBED map — never the raw document.
			return response.json({ ...base, messages: scrubMessages(Object.fromEntries((kit.messages ?? new Map()) as Map<string, string>)) });
		}

		// POST: import into a guild and activate it.
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;

		const { guildId } = request.query as { guildId?: string };
		if (!guildId || !isSnowflake(guildId)) return response.status(400).json({ error: 'guildId query parameter is required' });
		if (!requireManageableGuild(auth, guildId, response)) return undefined;

		const source = await MessageKit.findOne({ kitId }).lean();
		if (!source) return response.status(404).json({ error: 'Kit not found' });

		// Rule 1: re-validate, do not trust the stored document.
		const parsed = validateMessages(Object.fromEntries((source.messages ?? new Map()) as Map<string, string>));
		if (!parsed.ok) {
			return response.status(400).json({
				error: 'This kit is no longer valid and cannot be imported',
				errors: parsed.errors
			});
		}

		const authorId = await getTokenUserId(auth.token);
		if (!authorId) return response.status(401).json({ error: 'Could not resolve your Discord id' });

		// Rule 2: copy into a guild-owned document.
		const imported = await MessageKit.create({
			kitId: newKitId(),
			name: source.name,
			description: source.description,
			locale: isLocale(source.locale) ? source.locale : 'en',
			authorId,
			authorName: '',
			ownerGuildId: guildId,
			sourceKitId: source.kitId,
			messages: parsed.messages
		});

		await Guild.updateOne({ guildId }, { $set: { activeKitId: imported.kitId } });
		await MessageKit.updateOne({ kitId: source.kitId }, { $inc: { imports: 1 } });
		clearGuildStrings(guildId);

		return response.status(201).json({
			kitId: imported.kitId,
			name: imported.name,
			importedFrom: source.kitId,
			active: true
		});
	}
}

/** Activate an existing guild-owned kit, or clear the active kit with null. */
@ApplyOptions<RouteOptions>({
	name: 'api-guild-kit',
	route: 'guilds/[guildId]/kit',
	methods: ['POST']
})
export class ApiGuildKitRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;

		const { guildId } = request.params as { guildId?: string };
		if (!guildId || !isSnowflake(guildId)) return response.status(400).json({ error: 'Invalid guildId parameter' });
		if (!requireManageableGuild(auth, guildId, response)) return undefined;

		const body = await readJsonBody<Record<string, unknown>>(request);

		if (body.kitId === null || body.kitId === '') {
			await Guild.updateOne({ guildId }, { $set: { activeKitId: null } });
			clearGuildStrings(guildId);
			return response.json({ guildId, activeKitId: null });
		}

		if (typeof body.kitId !== 'string' || !KIT_ID_PATTERN.test(body.kitId)) {
			return response.status(400).json({ error: 'kitId must be null or a valid kit id' });
		}

		// Only a kit this guild owns may be activated directly; anything else has
		// to go through the import route so it gets copied and re-validated.
		const owned = await MessageKit.findOne({ kitId: body.kitId, ownerGuildId: guildId }).lean();
		if (!owned) return response.status(404).json({ error: 'Kit not found in this server — import it instead' });

		await Guild.updateOne({ guildId }, { $set: { activeKitId: owned.kitId } });
		clearGuildStrings(guildId);
		return response.json({ guildId, activeKitId: owned.kitId });
	}
}
