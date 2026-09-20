import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { readFile } from 'node:fs/promises';
import { getBackground } from '../../lib/cards/cardBackgrounds';
import { resolveCardAsset } from '../../lib/cards/greetCard';
import { requireAuth } from '../../lib/utils/apiAuth';

/**
 * Serve bundled greeting-card backgrounds (src/db/assets/cards/).
 * Used by the dashboard for live card previews. Any logged-in user may fetch;
 * choosing a premium background is still gated in guild-config validation.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-cards',
	route: 'cards/[key]',
	methods: ['GET']
})
export class ApiCardsRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;

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
