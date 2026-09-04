import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { Guild } from '../../models/Guild';
import { GuildConfigService } from '../../lib/services/GuildConfigService';
import { postFeedNow } from '../../lib/services/RedditFeedService';
import { isSnowflake, readJsonBody, readQueryParam, requireAuth, requireManageableGuild } from '../../lib/utils/apiAuth';

const SUBREDDIT_PATTERN = /^[A-Za-z0-9_]{3,21}$/;
const MAX_FEEDS = 10;

function cleanSubreddit(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim().replace(/^r\//i, '');
	return SUBREDDIT_PATTERN.test(trimmed) ? trimmed : null;
}

function cleanInterval(value: unknown): number | null {
	if (value === undefined) return 60;
	if (!Number.isInteger(value) || (value as number) < 10 || (value as number) > 1440) return null;
	return value as number;
}

function cleanChannelId(value: unknown): string | null {
	return typeof value === 'string' && isSnowflake(value) ? value : null;
}

function serialize(feed: any) {
	return {
		feedId: String(feed._id ?? ''),
		channelId: feed.channelId,
		subreddit: feed.subreddit,
		intervalMinutes: feed.intervalMinutes,
		lastPostedAt: feed.lastPostedAt ?? null,
		lastPostLink: feed.lastPostLink ?? null,
		active: feed.active !== false
	};
}

/**
 * Reddit auto-feed subscriptions (auto-post subreddit pics on a timer).
 * GET lists. POST creates. PATCH updates / triggers an immediate post.
 * DELETE removes (?feedId=). Manager-only; feeds run while Fun module is on.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-guild-reddit-feeds',
	route: 'guilds/[guildId]/reddit-feeds',
	methods: ['GET', 'POST', 'PATCH', 'DELETE']
})
export class ApiGuildRedditFeedsRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;

		const { guildId } = request.params as { guildId?: string };
		if (!guildId || !isSnowflake(guildId)) return response.status(400).json({ error: 'Invalid guildId parameter' });

		const manageable = requireManageableGuild(auth, guildId, response);
		if (!manageable) return undefined;

		const method = request.method;

		if (method === 'GET') {
			try {
				const data = await GuildConfigService.getOrCreateGuildData(guildId);
				return response.json({ guildId, total: data.redditFeeds?.length ?? 0, feeds: (data.redditFeeds ?? []).map(serialize) });
			} catch {
				return response.status(500).json({ error: 'Failed to load reddit feeds' });
			}
		}

		if (method === 'POST') {
			const body = await readJsonBody<Record<string, unknown>>(request);
			const channelId = cleanChannelId(body.channelId);
			const subreddit = cleanSubreddit(body.subreddit);
			const intervalMinutes = cleanInterval(body.intervalMinutes);
			if (!channelId || !subreddit || intervalMinutes === null) {
				return response.status(400).json({
					error: 'channelId (snowflake), subreddit (3-21 chars, letters/numbers/underscore) and intervalMinutes (10-1440) are required'
				});
			}
			const active = body.active !== false;
			try {
				const data = await GuildConfigService.getOrCreateGuildData(guildId);
				const feeds = data.redditFeeds ?? [];
				if (feeds.length >= MAX_FEEDS) {
					return response.status(409).json({ error: `Feed limit reached (max ${MAX_FEEDS} per server)` });
				}
				if (feeds.some((f) => f.channelId === channelId && f.subreddit.toLowerCase() === subreddit.toLowerCase())) {
					return response.status(409).json({ error: 'This subreddit is already feeding that channel' });
				}
				const feed = { channelId, subreddit, intervalMinutes, active, lastPostedAt: null, lastPostLink: null, createdBy: 'api', createdAt: new Date() };
				await Guild.updateOne({ guildId }, { $push: { redditFeeds: feed } });
				const updated = await Guild.findOne({ guildId }, { redditFeeds: 1 }).lean();
				const created = updated?.redditFeeds?.[updated.redditFeeds.length - 1];
				return response.status(201).json({ guildId, feed: created ? serialize(created) : null });
			} catch {
				return response.status(500).json({ error: 'Failed to create reddit feed' });
			}
		}

		if (method === 'PATCH') {
			const body = await readJsonBody<Record<string, unknown>>(request);
			const feedId = typeof body.feedId === 'string' ? body.feedId : null;
			if (!feedId || !/^[a-f0-9]{24}$/i.test(feedId)) {
				return response.status(400).json({ error: 'feedId is required' });
			}
			try {
				const data = await GuildConfigService.getOrCreateGuildData(guildId);
				const idx = (data.redditFeeds ?? []).findIndex((f: any) => String(f._id) === feedId);
				if (idx === -1) return response.status(404).json({ error: 'Reddit feed not found' });
				const current = (data.redditFeeds ?? [])[idx]!;

				const setOps: Record<string, unknown> = {};
				if (body.channelId !== undefined) {
					const channelId = cleanChannelId(body.channelId);
					if (!channelId) return response.status(400).json({ error: 'channelId must be a snowflake' });
					setOps[`redditFeeds.${idx}.channelId`] = channelId;
				}
				if (body.subreddit !== undefined) {
					const subreddit = cleanSubreddit(body.subreddit);
					if (!subreddit) return response.status(400).json({ error: 'subreddit must be 3-21 chars (letters/numbers/underscore)' });
					setOps[`redditFeeds.${idx}.subreddit`] = subreddit;
				}
				if (body.intervalMinutes !== undefined) {
					const intervalMinutes = cleanInterval(body.intervalMinutes);
					if (intervalMinutes === null) return response.status(400).json({ error: 'intervalMinutes must be 10-1440' });
					setOps[`redditFeeds.${idx}.intervalMinutes`] = intervalMinutes;
				}
				if (body.active !== undefined) {
					if (typeof body.active !== 'boolean') return response.status(400).json({ error: 'active must be a boolean' });
					setOps[`redditFeeds.${idx}.active`] = body.active;
				}

				// Immediate test post (uses updated values where provided).
				let posted: string | null = null;
				if (body.postNow === true) {
					const channelId = (setOps[`redditFeeds.${idx}.channelId`] as string | undefined) ?? current.channelId;
					const subreddit = (setOps[`redditFeeds.${idx}.subreddit`] as string | undefined) ?? current.subreddit;
					try {
						posted = await postFeedNow(guildId, channelId, subreddit, current.lastPostLink);
					} catch (error) {
						const reason = error instanceof Error ? error.message : 'Failed to post';
						return response.status(502).json({ error: `Could not post: ${reason}` });
					}
					setOps[`redditFeeds.${idx}.lastPostedAt`] = new Date();
					setOps[`redditFeeds.${idx}.lastPostLink`] = posted;
				}

				if (Object.keys(setOps).length === 0) return response.status(400).json({ error: 'No fields to update' });
				await Guild.updateOne({ guildId }, { $set: setOps });
				const updated = await Guild.findOne({ guildId }, { redditFeeds: 1 }).lean();
				const feed = updated?.redditFeeds?.find((f: any) => String(f._id) === feedId);
				return response.json({ guildId, feed: feed ? serialize(feed) : null, posted });
			} catch {
				return response.status(500).json({ error: 'Failed to update reddit feed' });
			}
		}

		// DELETE ?feedId=...
		const feedId = readQueryParam(request, 'feedId');
		if (!feedId || !/^[a-f0-9]{24}$/i.test(feedId)) {
			return response.status(400).json({ error: 'feedId query param is required' });
		}
		try {
			const result = await Guild.updateOne({ guildId }, { $pull: { redditFeeds: { _id: feedId } as never } });
			if (result.modifiedCount === 0) return response.status(404).json({ error: 'Reddit feed not found' });
			return response.json({ guildId, deleted: feedId });
		} catch {
			return response.status(500).json({ error: 'Failed to delete reddit feed' });
		}
	}
}
