import { Events, Listener } from '@sapphire/framework';
import type { Sticker } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class StickerUpdateLogListener extends Listener<typeof Events.GuildStickerUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) { super(context, { ...options, event: Events.GuildStickerUpdate }); }
	public override async run(oldSticker: Sticker, sticker: Sticker) {
		if (!sticker.guild) return;
		const changes = [['Name', oldSticker.name, sticker.name], ['Description', oldSticker.description, sticker.description], ['Tags', oldSticker.tags, sticker.tags], ['Available', oldSticker.available, sticker.available]].filter(([, before, after]) => before !== after);
		if (!changes.length) return;
		await sendLog(sticker.guild, 'emoji.update', { title: 'Sticker updated', description: `Sticker **${sticker.name}** (${sticker.id}) updated.`, fields: changes.map(([name, before, after]) => ({ name: String(name), value: `Before: ${String(before ?? '*none*')}\nAfter: ${String(after ?? '*none*')}` })) });
	}
}
