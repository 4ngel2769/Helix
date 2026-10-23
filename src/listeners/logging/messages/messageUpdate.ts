import { Events, Listener } from '@sapphire/framework';
import type { Message, OmitPartialGroupDMChannel, PartialMessage } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

type MaybePartial = OmitPartialGroupDMChannel<Message | PartialMessage>;

export class MessageUpdateLogListener extends Listener<typeof Events.MessageUpdate> {
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
