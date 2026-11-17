import { Events, Listener } from '@sapphire/framework';
import type { NonThreadGuildBasedChannel } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class ChannelCreateLogListener extends Listener<typeof Events.ChannelCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.ChannelCreate });
	}
	public override async run(channel: NonThreadGuildBasedChannel) {
		const fields = [
			{ name: 'Type', value: channel.type.toString(), inline: true },
			...(channel.parentId ? [{ name: 'Category', value: channel.parentId, inline: true }] : []),
			...('topic' in channel && channel.topic ? [{ name: 'Topic', value: channel.topic, inline: false }] : []),
			...('rateLimitPerUser' in channel ? [{ name: 'Slowmode', value: `${channel.rateLimitPerUser}s`, inline: true }] : []),
			...('bitrate' in channel ? [{ name: 'Bitrate', value: `${Math.round(channel.bitrate / 1000)} kbps`, inline: true }] : []),
			...('userLimit' in channel ? [{ name: 'User limit', value: channel.userLimit === 0 ? 'Unlimited' : String(channel.userLimit), inline: true }] : [])
		];
		await sendLog(channel.guild, 'channel.create', {
			description: `Channel <#${channel.id}> (**${channel.name}**) created.`,
			fields
		});
	}
}
