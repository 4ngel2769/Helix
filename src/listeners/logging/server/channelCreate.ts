import { Events, Listener } from '@sapphire/framework';
import type { NonThreadGuildBasedChannel } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class ChannelCreateLogListener extends Listener<typeof Events.ChannelCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.ChannelCreate });
	}
	public override async run(channel: NonThreadGuildBasedChannel) {
		await sendLog(channel.guild, 'channel.create', {
			description: `Channel <#${channel.id}> (**${channel.name}**) created.`
		});
	}
}
