import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { Auction } from '../../models/Auction';
import { isSnowflake, readQueryParam } from '../../lib/utils/apiAuth';

/**
 * Auction house listing (read-only).
 * GET /auctions?status=active&guildId=&sellerId=&limit=&page=&auctionId=
 */
@ApplyOptions<RouteOptions>({
	name: 'api-auctions',
	route: 'auctions',
	methods: ['GET']
})
export class ApiAuctionsRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		try {
			const auctionId = readQueryParam(request, 'auctionId');
			if (auctionId) {
				if (auctionId.length > 128) return response.status(400).json({ error: 'Invalid auctionId parameter' });
				const auction = await Auction.findOne({ auctionId }).lean();
				if (!auction) return response.status(404).json({ error: 'Auction not found' });
				return response.json({ auction });
			}

			const status = readQueryParam(request, 'status') ?? 'active';
			const allowed = ['active', 'completed', 'cancelled', 'expired'];
			if (!allowed.includes(status)) {
				return response.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
			}
			const guildId = readQueryParam(request, 'guildId');
			const sellerId = readQueryParam(request, 'sellerId');
			if ((guildId && !isSnowflake(guildId)) || (sellerId && !isSnowflake(sellerId))) {
				return response.status(400).json({ error: 'Invalid guildId/sellerId parameter' });
			}
			const limit = Math.min(Math.max(parseInt(readQueryParam(request, 'limit') ?? '25', 10) || 25, 1), 100);
			const page = Math.max(parseInt(readQueryParam(request, 'page') ?? '1', 10) || 1, 1);

			const filter: Record<string, unknown> = { status };
			if (guildId) filter.guildId = guildId;
			if (sellerId) filter.sellerId = sellerId;

			const [total, auctions] = await Promise.all([
				Auction.countDocuments(filter),
				Auction.find(filter).sort({ endTime: 1 }).skip((page - 1) * limit).limit(limit).lean()
			]);

			return response.json({ total, page, limit, status, auctions });
		} catch {
			return response.status(500).json({ error: 'Failed to load auctions' });
		}
	}
}
