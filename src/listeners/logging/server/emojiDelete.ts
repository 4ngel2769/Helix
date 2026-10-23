import { Events, Listener } from '@sapphire/framework';
import type { GuildEmoji } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class EmojiDeleteLogListener extends Listener<typeof Events.GuildEmojiDelete> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildEmojiDelete });
	}
	public override async run(emoji: GuildEmoji) {
		await sendLog(emoji.guild, 'emoji.update', {
			description: `Emoji ${emoji.name} (${emoji.id}) removed.`
		});
	}
}
