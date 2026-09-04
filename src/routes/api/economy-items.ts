import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { EconomyItem } from '../../models/EconomyItem';
import { readQueryParam } from '../../lib/utils/apiAuth';

const MAX_LIMIT = 100;

/**
 * Shop / item catalog.
 * GET /items?search=&category=&rarity=&shopOnly=true&limit=&page=&itemId=
 */
@ApplyOptions<RouteOptions>({
	name: 'api-economy-items',
	route: 'economy/items',
	methods: ['GET']
})
export class ApiEconomyItemsRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		try {
			const itemId = readQueryParam(request, 'itemId');
			if (itemId) {
				const item = await EconomyItem.findOne({ itemId }).lean();
				if (!item) return response.status(404).json({ error: 'Item not found' });
				return response.json({ item });
			}

			const search = readQueryParam(request, 'search');
			const category = readQueryParam(request, 'category');
			const rarity = readQueryParam(request, 'rarity');
			const shopOnly = readQueryParam(request, 'shopOnly') === 'true';
			const limit = Math.min(Math.max(parseInt(readQueryParam(request, 'limit') ?? '25', 10) || 25, 1), MAX_LIMIT);
			const page = Math.max(parseInt(readQueryParam(request, 'page') ?? '1', 10) || 1, 1);

			const filter: Record<string, unknown> = {};
			if (search) filter.name = { $regex: search, $options: 'i' };
			if (category) filter.category = category;
			if (rarity) filter.rarity = rarity;
			if (shopOnly) filter['shop.available'] = true;

			const [total, items] = await Promise.all([
				EconomyItem.countDocuments(filter),
				EconomyItem.find(filter).sort({ basePrice: 1 }).skip((page - 1) * limit).limit(limit).lean()
			]);

			return response.json({ total, page, limit, items });
		} catch {
			return response.status(500).json({ error: 'Failed to load economy items' });
		}
	}
}
