import { Events, Listener } from '@sapphire/framework';
import type { Message, OmitPartialGroupDMChannel, PartialMessage } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

type MaybePartial = OmitPartialGroupDMChannel<Message | PartialMessage>;

export class MessageDeleteLogListener extends Listener<typeof Events.MessageDelete> {
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
