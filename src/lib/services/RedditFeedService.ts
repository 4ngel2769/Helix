import { container } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable, type TextChannel } from 'discord.js';
import config from '../../config';
import { Guild } from '../../models/Guild';
import { GuildConfigService } from './GuildConfigService';

export interface RedditPost {
	postLink: string;
	subreddit: string;
	title: string;
	url: string;
	nsfw: boolean;
	spoiler: boolean;
	author: string;
	ups: number;
}

interface MemeApiSingle extends RedditPost {
	preview: string[];
}

interface MemeApiMulti {
	count: number;
	memes: MemeApiSingle[];
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

function isImageUrl(url: string): boolean {
	try {
		const path = new URL(url).pathname.toLowerCase();
		return IMAGE_EXTENSIONS.some((ext) => path.endsWith(ext));
	} catch {
		return false;
	}
}

/** Fetch fresh posts from a subreddit via meme-api (no auth needed). */
export async function fetchSubredditPosts(subreddit: string, count = 10): Promise<RedditPost[]> {
	const response = await fetch(`https://meme-api.com/gimme/${encodeURIComponent(subreddit)}/${count}`);
	if (!response.ok) throw new Error(`Subreddit lookup failed (${response.status})`);
	const payload = (await response.json()) as MemeApiSingle | MemeApiMulti | { message?: string };
	if ('message' in payload && typeof payload.message === 'string' && !('memes' in payload) && !('postLink' in payload)) {
		throw new Error(payload.message);
	}
	if ('memes' in payload) return payload.memes;
	return [payload as MemeApiSingle];
}

function buildFeedEmbed(post: RedditPost): EmbedBuilder {
	const embed = new EmbedBuilder()
		.setColor(config.bot.embedColor.default as ColorResolvable)
		.setTitle(post.title.slice(0, 256))
		.setURL(post.postLink)
		.setFooter({ text: `👍 ${post.ups} • u/${post.author} in r/${post.subreddit}` })
		.setTimestamp();
	if (isImageUrl(post.url)) embed.setImage(post.url);
	return embed;
}

/**
 * Post one fresh (non-NSFW, not the same as last time) item for a feed.
 * Returns the posted link. Throws with a human-readable reason on failure.
 */
export async function postFeedNow(guildId: string, channelId: string, subreddit: string, lastPostLink?: string | null): Promise<string> {
	const guild = container.client.guilds.cache.get(guildId);
	if (!guild) throw new Error('Bot is not in this guild');
	const channel = (await guild.channels.fetch(channelId).catch(() => null)) as TextChannel | null;
	if (!channel || !channel.isTextBased()) throw new Error('Channel not found or not a text channel');

	const me = guild.members.me;
	if (!me?.permissions.has('SendMessages') || !channel.permissionsFor(me)?.has(['SendMessages', 'EmbedLinks'])) {
		throw new Error('I need Send Messages + Embed Links in the target channel');
	}

	const posts = await fetchSubredditPosts(subreddit, 10);
	const fresh = posts.find((p) => !p.nsfw && p.postLink !== lastPostLink && p.title && p.postLink && p.url)
		?? posts.find((p) => !p.nsfw && p.title && p.postLink && p.url);
	if (!fresh) throw new Error('No suitable posts right now (subreddit may be empty or NSFW-only)');

	await (channel as TextChannel).send({ embeds: [buildFeedEmbed(fresh)] });
	return fresh.postLink;
}

export class RedditFeedService {
	/** Post to every due, active feed. Runs every few minutes from the background job. */
	public static async processDueFeeds(): Promise<void> {
		let guilds;
		try {
			guilds = await Guild.find({ redditFeeds: { $elemMatch: { active: true } } }).lean();
		} catch (error) {
			container.logger.warn('[reddit-feeds] DB lookup failed:', error);
			return;
		}
		const now = Date.now();
		for (const guild of guilds) {
			// Feeds only run while the Fun module (home of the reddit commands) is on.
			const funOn = await GuildConfigService.resolveModuleState({
				guildId: guild.guildId,
				moduleKey: 'fun',
				moduleDisplayName: 'Fun',
				defaultWhenNoGuild: false,
				defaultWhenMissing: true,
				defaultOnError: true,
				logger: container.logger
			});
			if (!funOn) continue;

			for (const feed of guild.redditFeeds ?? []) {
				if (!feed.active) continue;
				const intervalMs = Math.min(Math.max(feed.intervalMinutes || 60, 10), 1440) * 60_000;
				const last = feed.lastPostedAt ? new Date(feed.lastPostedAt).getTime() : 0;
				if (now - last < intervalMs) continue;
				try {
					const link = await postFeedNow(guild.guildId, feed.channelId, feed.subreddit, feed.lastPostLink);
					await Guild.updateOne(
						{ guildId: guild.guildId, 'redditFeeds.channelId': feed.channelId, 'redditFeeds.subreddit': feed.subreddit },
						{ $set: { 'redditFeeds.$.lastPostedAt': new Date(), 'redditFeeds.$.lastPostLink': link } }
					);
				} catch (error) {
					const reason = error instanceof Error ? error.message : 'unknown error';
					container.logger.warn(`[reddit-feeds] r/${feed.subreddit} → ${guild.guildId}/${feed.channelId} skipped: ${reason}`);
				}
			}
		}
	}
}
