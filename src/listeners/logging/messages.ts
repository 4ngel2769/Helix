import { Events, Listener } from '@sapphire/framework';
import type {
	GuildTextBasedChannel,
	Message,
	OmitPartialGroupDMChannel,
	PartialMessage,
	ReadonlyCollection,
	Snowflake
} from 'discord.js';
import { sendLog } from '../../lib/logging/logService';

type MaybePartial = OmitPartialGroupDMChannel<Message | PartialMessage>;

export class MessageDeleteListener extends Listener<typeof Events.MessageDelete> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.MessageDelete });
	}

	public override async run(message: MaybePartial) {
		if (!message.guild) return;
		const full = message.partial ? await message.fetch().catch(() => null) : message;
		const content = (full?.content ?? message.content ?? '').trim();
		const author = full?.author ?? message.author;
		await sendLog(message.guild, 'message.delete', {
			description: `Message by **${author?.tag ?? 'unknown'}** (<@${author?.id}>) deleted in <#${message.channelId}>.`,
			fields: content
				? [{ name: 'Content', value: content.slice(0, 1024) }]
				: full && full.attachments.size > 0
					? [{ name: 'Content', value: `*${full.attachments.size} attachment(s), no text*` }]
					: [],
			targetId: author?.id,
			contextChannelId: message.channelId,
			isBot: author?.bot ?? false
		});
	}
}

export class MessageUpdateListener extends Listener<typeof Events.MessageUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.MessageUpdate });
	}

	public override async run(oldMessage: MaybePartial, newMessage: OmitPartialGroupDMChannel<Message>) {
		if (!newMessage.guild) return;
		if (oldMessage.partial) await oldMessage.fetch().catch(() => null);
		const full = newMessage.partial ? await newMessage.fetch().catch(() => null) : newMessage;
		const before = (oldMessage.content ?? '').trim();
		const after = (full?.content ?? newMessage.content ?? '').trim();
		if (!before && !after) return; // embed-only update, skip noise
		if (before === after) return;
		const author = full?.author ?? newMessage.author;
		await sendLog(newMessage.guild, 'message.edit', {
			description: `Message by **${author?.tag ?? 'unknown'}** (<@${author?.id}>) edited in <#${newMessage.channelId}>.`,
			fields: [
				...(before ? [{ name: 'Before', value: before.slice(0, 1024) }] : []),
				...(after ? [{ name: 'After', value: after.slice(0, 1024) }] : [])
			],
			targetId: author?.id,
			contextChannelId: newMessage.channelId,
			isBot: author?.bot ?? false
		});
	}
}

export class MessageBulkDeleteListener extends Listener<typeof Events.MessageBulkDelete> {
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
