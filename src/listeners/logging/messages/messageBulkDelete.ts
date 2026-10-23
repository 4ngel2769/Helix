import { Events, Listener } from '@sapphire/framework';
import type { GuildTextBasedChannel, Message, PartialMessage, ReadonlyCollection, Snowflake } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class MessageBulkDeleteLogListener extends Listener<typeof Events.MessageBulkDelete> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.MessageBulkDelete });
	}

	public override async run(
		messages: ReadonlyCollection<Snowflake, Message<true> | PartialMessage<true>>,
		channel: GuildTextBasedChannel
	) {
		await sendLog(channel.guild, 'message.bulkDelete', {
			description: `**${messages.size}** messages bulk-deleted in <#${channel.id}>.`,
			contextChannelId: channel.id
		});
	}
}
