import { Events, Listener } from '@sapphire/framework';
import type { GuildEmoji } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class EmojiUpdateLogListener extends Listener<typeof Events.GuildEmojiUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) { super(context, { ...options, event: Events.GuildEmojiUpdate }); }
	public override async run(oldEmoji: GuildEmoji, emoji: GuildEmoji) {
		const before = [...oldEmoji.roles.cache.keys()].sort().join(','); const after = [...emoji.roles.cache.keys()].sort().join(',');
		const changes = [['Name', oldEmoji.name, emoji.name], ['Animated', oldEmoji.animated, emoji.animated], ['Available', oldEmoji.available, emoji.available], ['Role restrictions', before, after]].filter(([, a, b]) => a !== b);
		if (!changes.length) return;
		await sendLog(emoji.guild, 'emoji.update', { title: 'Emoji updated', description: `Emoji ${emoji.name} (${emoji.id}) updated.`, fields: changes.map(([name, a, b]) => ({ name: String(name), value: `Before: ${String(a)}\nAfter: ${String(b)}` })) });
	}
}
