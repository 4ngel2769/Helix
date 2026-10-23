import type { Channel, DMChannel, Guild, NonThreadGuildBasedChannel } from 'discord.js';

/** Narrow a channel event argument to a guild channel, or null when it is DM-based. */
export function guildChannel(channel: Channel): (NonThreadGuildBasedChannel & { guild: Guild }) | null {
	if (channel.isDMBased()) return null;
	const guild = (channel as Partial<NonThreadGuildBasedChannel>).guild;
	return guild ? (channel as NonThreadGuildBasedChannel & { guild: Guild }) : null;
}

export type MaybeGuildChannel = DMChannel | NonThreadGuildBasedChannel;
