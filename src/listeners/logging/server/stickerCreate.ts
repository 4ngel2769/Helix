import { Events, Listener } from '@sapphire/framework';
import type { Sticker } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class StickerCreateLogListener extends Listener<typeof Events.GuildStickerCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildStickerCreate });
	}

	public override async run(sticker: Sticker) {
		if (!sticker.guild) return;
		await sendLog(sticker.guild, 'emoji.update', {
			title: 'Sticker added',
			description: `Sticker **${sticker.name}** (\`${sticker.id}\`) was added.`
		});
	}
}
