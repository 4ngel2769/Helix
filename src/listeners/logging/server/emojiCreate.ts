import { Events, Listener } from '@sapphire/framework';
import type { GuildEmoji } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class EmojiCreateLogListener extends Listener<typeof Events.GuildEmojiCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildEmojiCreate });
	}
	public override async run(emoji: GuildEmoji) {
		await sendLog(emoji.guild, 'emoji.update', {
			description: `Emoji ${emoji.name} (${emoji.id}) added.`
		});
	}
}
