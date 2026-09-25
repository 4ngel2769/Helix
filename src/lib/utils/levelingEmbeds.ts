import { AttachmentBuilder, EmbedBuilder, type ColorResolvable, type Guild, type User } from 'discord.js';
import { GuildXp } from '../../models/GuildXp';
import { levelForXp, progressBar, progressToNext } from './leveling';
import { sanitizeText } from './sanitize';
import config from '../../config';

export interface RankData {
	user: User;
	xp: number;
	rank: number;
}

export async function fetchRank(guildId: string, user: User): Promise<RankData> {
	const doc = await GuildXp.findOne({ guildId, userId: user.id }).lean();
	const xp = doc?.xp ?? 0;
	return { user, xp, rank: (await GuildXp.countDocuments({ guildId, xp: { $gt: xp } })) + 1 };
}

export function rankEmbed(data: RankData): EmbedBuilder {
	const { level, into, needed } = progressToNext(data.xp);
	return new EmbedBuilder()
		.setColor(config.bot.embedColor.default as ColorResolvable)
		.setTitle(`${data.user.username}'s rank`)
		.setThumbnail(data.user.displayAvatarURL())
		.addFields(
			{ name: 'Level', value: String(level), inline: true },
			{ name: 'Server rank', value: `#${data.rank}`, inline: true },
			{ name: 'Progress', value: `${progressBar(into, needed)} ${into}/${needed} XP`, inline: false }
		)
		.setFooter({ text: `${data.xp.toLocaleString('en-US')} total XP` });
}

/** Rank reply with a canvas card when it renders, embed-only otherwise. */
export async function rankPayload(guild: Guild | null, data: RankData) {
	const { level, into, needed } = progressToNext(data.xp);
	const base = { embeds: [rankEmbed(data)] } as { embeds: EmbedBuilder[]; files?: AttachmentBuilder[] };
	try {
		const { renderRankCard } = await import('../cards/rankCard.js');
		const png = await renderRankCard({
			displayName: data.user.displayName || data.user.username,
			avatarUrl: data.user.displayAvatarURL({ size: 256, extension: 'png' }),
			serverName: sanitizeText(guild?.name ?? 'Server', 40) ?? 'Server',
			level,
			totalXp: data.xp,
			into,
			needed,
			rank: data.rank
		});
		base.files = [new AttachmentBuilder(png, { name: 'rank.png' })];
	} catch {
		// canvas unavailable — the embed already carries everything
	}
	return base;
}

export async function fetchTop(guildId: string, limit = 10) {
	return GuildXp.find({ guildId }).sort({ xp: -1 }).limit(limit).lean();
}

export function emptyLeaderboardMessage(levelingModuleOn: boolean): string {
	return levelingModuleOn
		? 'Nobody has earned XP here yet — start chatting!'
		: 'Leveling is not switched on here yet — enable the Leveling module (dashboard Modules page or /configmodule), then start chatting!';
}

export function leaderboardEmbed(guild: Guild | null, top: Array<{ userId: string; xp: number }>): EmbedBuilder {
	const medals = ['🥇', '🥈', '🥉'];
	const lines = top.map((row, i) => `${medals[i] ?? `**${i + 1}.**`} <@${row.userId}> — level ${levelForXp(row.xp)} (${row.xp.toLocaleString('en-US')} XP)`);
	return new EmbedBuilder()
		.setColor(config.bot.embedColor.default as ColorResolvable)
		.setTitle(`🏆 ${guild?.name ?? 'Server'} leaderboard`)
		.setDescription(lines.join('\n'));
}
