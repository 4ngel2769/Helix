import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { MessageKit, newKitId } from '../../models/MessageKit';
import { Guild } from '../../models/Guild';
import { getTokenUserId, isSnowflake, readJsonBody, requireAuth, requireManageableGuild } from '../../lib/utils/apiAuth';
import { clearGuildStrings } from '../../lib/i18n/guildStrings';
import { isLocale, KEYS, LOCALE_CODES, LOCALES, PLACEHOLDER_DOC } from '../../lib/i18n';
import { validateKit, validateMessages } from '../../lib/kits/validation';

const MAX_KITS_PER_GUILD = 20;

function toPublic(kit: { kitId: string; name: string; description: string; locale: string; authorName: string; messages: unknown; imports: number; updatedAt: Date }) {
	return {
		kitId: kit.kitId,
		name: kit.name,
		description: kit.description,
		locale: kit.locale,
		authorName: kit.authorName,
		imports: kit.imports,
		updatedAt: kit.updatedAt,
		messages: Object.fromEntries((kit.messages ?? new Map()) as Map<string, string>)
	};
}

/**
 * Message kits: a named, shareable bundle of message overrides for one locale.
 *
 * Every write goes through `validateKit` / `validateMessages`, and an import
 * RE-VALIDATES the source document rather than trusting it — a kit stored years
 * ago, or edited directly in Mongo, still cannot land a raw mention or a link.
 * See src/lib/kits/validation.ts for the trust model.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-kits',
	route: 'kits',
	methods: ['GET', 'POST']
})
export class ApiKitsRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;

		if (request.method === 'GET') {
			// The public catalogue behind the share page. Unauthenticated callers
			// get metadata only; the full templates need a session so an
			// untrusted kit is never rendered to a logged-out visitor.
			const kits = await MessageKit.find({}, { kitId: 1, name: 1, description: 1, locale: 1, authorName: 1, imports: 1, updatedAt: 1 })
				.sort({ updatedAt: -1 })
				.limit(100)
				.lean();
			return response.json({
				kits: kits.map((k) => ({ ...k, messages: undefined })),
				locales: LOCALE_CODES.map((code) => ({ code, ...LOCALES[code] })),
				availableKeys: [...KEYS],
				placeholders: PLACEHOLDER_DOC
			});
		}

		const { guildId } = request.query as { guildId?: string };
		if (!guildId || !isSnowflake(guildId)) return response.status(400).json({ error: 'guildId query parameter is required' });
		if (!requireManageableGuild(auth, guildId, response)) return undefined;

		const count = await MessageKit.countDocuments({ ownerGuildId: guildId });
		if (count >= MAX_KITS_PER_GUILD) return response.status(400).json({ error: `A server can hold at most ${MAX_KITS_PER_GUILD} kits` });

		const body = await readJsonBody<Record<string, unknown>>(request);
		const parsed = validateKit(body);
		if (!parsed.ok) return response.status(400).json({ error: 'Invalid kit', errors: parsed.errors });

		const authorId = await getTokenUserId(auth.token);
		if (!authorId) return response.status(401).json({ error: 'Could not resolve your Discord id' });

		const locale = isLocale(body.locale) ? body.locale : 'en';
		const kit = await MessageKit.create({
			kitId: newKitId(),
			name: parsed.name,
			description: parsed.description,
			locale,
			authorId,
			authorName: '',
			ownerGuildId: guildId,
			sourceKitId: null,
			messages: parsed.messages
		});

		// Creating a kit implies you want to use it.
		await Guild.updateOne({ guildId }, { $set: { activeKitId: kit.kitId } });
		clearGuildStrings(guildId);
		return response.status(201).json({ kit: toPublic(kit.toObject()) });
	}
}
