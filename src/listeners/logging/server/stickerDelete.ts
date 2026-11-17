import { Events, Listener } from '@sapphire/framework';
import type { Sticker } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class StickerDeleteLogListener extends Listener<typeof Events.GuildStickerDelete> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildStickerDelete });
	}

	public override async run(sticker: Sticker) {
		if (!sticker.guild) return;
		await sendLog(sticker.guild, 'emoji.update', {
			title: 'Sticker removed',
			description: `Sticker **${sticker.name}** (\`${sticker.id}\`) was removed.`,
			fields: [{ name: 'Description', value: sticker.description || '*none*' }, { name: 'Tags', value: sticker.tags || '*none*', inline: true }]
		});
	}
}
