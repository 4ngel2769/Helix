import { container } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../config';

function baseEmbed(title: string, description: string): EmbedBuilder {
	return new EmbedBuilder()
		.setColor(config.bot.embedColor.default as ColorResolvable)
		.setTitle(title)
		.setDescription(description.slice(0, 4000))
		.setTimestamp();
}

/** Best-effort DM. Returns true when Discord accepted it (false = closed DMs / left server / unknown user). */
async function dmUser(userId: string, embed: EmbedBuilder): Promise<boolean> {
	try {
		const user = await container.client.users.fetch(userId);
		await user.send({ embeds: [embed] });
		return true;
	} catch {
		return false;
	}
}

/** Best-effort DM to a guild's owner. False when the bot is gone, owner unknown, or DMs closed. */
async function dmGuildOwner(guildId: string, embed: EmbedBuilder): Promise<boolean> {
	try {
		const guild = container.client.guilds.cache.get(guildId) ?? (await container.client.guilds.fetch(guildId).catch(() => null));
		if (!guild) return false;
		const owner = await guild.fetchOwner().catch(() => null);
		if (!owner) return false;
		await owner.send({ embeds: [embed] });
		return true;
	} catch {
		return false;
	}
}

export function guildDisplayName(guildId: string): string {
	return container.client.guilds.cache.get(guildId)?.name ?? 'your server';
}

/** Acting owner name for "gifted by …" lines. Falls back when the user can't be fetched. */
export async function grantedByName(devUserId: string): Promise<string> {
	try {
		const user = await container.client.users.fetch(devUserId);
		return user.username;
	} catch {
		return 'a Helix owner';
	}
}

export function relativeTimestamp(when: Date | string): string {
	const t = Math.floor(new Date(when).getTime() / 1000);
	return Number.isNaN(t) ? 'soon' : `<t:${t}:R>`;
}

export async function notifyUserPremium(userId: string, days: number | null, by: string): Promise<boolean> {
	const length = days === null ? 'lifetime' : `for **${days} day${days === 1 ? '' : 's'}**`;
	return dmUser(userId, baseEmbed('✨ Helix Premium gifted', `You've been gifted a Helix Premium subscription ${length} by **${by}**! Enjoy the perks.`));
}

export async function notifyUserPremiumEnding(userId: string, expiresAt: Date | string): Promise<boolean> {
	return dmUser(
		userId,
		baseEmbed('⏳ Helix Premium ending soon', `Your Helix Premium subscription ends ${relativeTimestamp(expiresAt)}. Ask a bot owner if you'd like to keep it.`)
	);
}

export async function notifyUserBanned(userId: string, reason: string | null): Promise<boolean> {
	const embed = baseEmbed('⛔ Banned from Helix', "You've been banned from using Helix.");
	if (reason) embed.addFields({ name: 'Reason', value: reason.slice(0, 1000) });
	return dmUser(userId, embed);
}

export async function notifyGuildPremium(guildId: string, days: number | null, by: string): Promise<boolean> {
	const length = days === null ? 'lifetime' : `for **${days} day${days === 1 ? '' : 's'}**`;
	return dmGuildOwner(
		guildId,
		baseEmbed('✨ Helix Premium gifted', `Your server **${guildDisplayName(guildId)}** has been gifted a Helix Premium subscription ${length} by **${by}**!`)
	);
}

export async function notifyGuildPremiumEnding(guildId: string, expiresAt: Date | string): Promise<boolean> {
	return dmGuildOwner(
		guildId,
		baseEmbed('⏳ Helix Premium ending soon', `Premium for **${guildDisplayName(guildId)}** ends ${relativeTimestamp(expiresAt)}. Contact a bot owner to renew.`)
	);
}

export async function notifyGuildBanned(guildId: string, reason: string | null): Promise<boolean> {
	const embed = baseEmbed(
		'⛔ Server banned from Helix',
		`Your server **${guildDisplayName(guildId)}** has been banned from using Helix. The bot has left and will refuse re-entry while the ban stands.`
	);
	if (reason) embed.addFields({ name: 'Reason', value: reason.slice(0, 1000) });
	return dmGuildOwner(guildId, embed);
}
