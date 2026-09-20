import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { readFile } from 'node:fs/promises';
import { getBackground } from '../../lib/cards/cardBackgrounds';
import { resolveCardAsset, renderGreetCard } from '../../lib/cards/greetCard';
import { validateGreetCard } from '../../lib/cards/cardValidation';
import { isSnowflake, readJsonBody, requireAuth, requireManageableGuild } from '../../lib/utils/apiAuth';

/**
 * Serve bundled greeting-card backgrounds (src/db/assets/cards/).
 * Used by the dashboard for live card previews. Any logged-in user may fetch;
 * choosing a premium background is still gated in guild-config validation.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-cards',
	route: 'cards/[key]',
	methods: ['GET', 'POST']
})
export class ApiCardsRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;

		// POST { guildId, card } renders a sample card PNG with the given config
		// (premium art allowed — seeing is not choosing; saving stays gated).
		if (request.method === 'POST') {
			const body = await readJsonBody<Record<string, unknown>>(request);
			const guildId = typeof body.guildId === 'string' ? body.guildId : null;
			if (!guildId || !isSnowflake(guildId)) return response.status(400).json({ error: 'guildId (snowflake) is required' });
			if (!requireManageableGuild(auth, guildId, response)) return undefined;
			const { card, error } = validateGreetCard(body.card, { allowPremium: true });
			if (error || !card) return response.status(400).json({ error: error ?? 'Invalid card config' });
			try {
				const png = await renderGreetCard(card, {
					displayName: 'Alex',
					avatarUrl: '',
					memberCount: 42,
					serverName: 'Preview Server',
					prefix: 'x',
					userTag: 'alex'
				});
				response.writeHead(200, {
					'content-type': 'image/png',
					'content-length': png.length,
					'cache-control': 'no-store'
				});
				response.end(png);
				return undefined;
			} catch {
				return response.status(500).json({ error: 'Failed to render card preview' });
			}
		}

		const { key } = request.params as { key?: string };
		const bg = typeof key === 'string' ? getBackground(key) : undefined;
		if (!bg || bg.key !== key || !bg.file) return response.status(404).json({ error: 'Card background not found' });

		const asset = resolveCardAsset(bg.file);
		if (!asset) return response.status(404).json({ error: 'Card background not found' });

		try {
			const data = await readFile(asset);
			response.writeHead(200, {
				'content-type': 'image/png',
				'content-length': data.length,
				'cache-control': 'public, max-age=86400'
			});
			response.end(data);
			return undefined;
		} catch {
			return response.status(404).json({ error: 'Card background not found' });
		}
	}
}
