import { Events, Listener } from '@sapphire/framework';
import type { GuildEmoji } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class EmojiCreateLogListener extends Listener<typeof Events.GuildEmojiCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildEmojiCreate });
	}
	public override async run(emoji: GuildEmoji) {
		await sendLog(emoji.guild, 'emoji.update', {
			description: `Emoji ${emoji.name} (${emoji.id}) added.`,
			fields: [{ name: 'Animated', value: emoji.animated ? 'Yes' : 'No', inline: true }, { name: 'Available', value: emoji.available ? 'Yes' : 'No', inline: true }, ...(emoji.roles.cache.size ? [{ name: 'Restricted roles', value: [...emoji.roles.cache.keys()].slice(0, 20).map((id) => `<@&${id}>`).join(', ') }] : [])]
		});
	}
}
