import { Events, Listener } from '@sapphire/framework';
import type { AnyThreadChannel } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class ThreadCreateLogListener extends Listener<typeof Events.ThreadCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.ThreadCreate });
	}
	public override async run(thread: AnyThreadChannel) {
		if (!thread.guild) return;
		await sendLog(thread.guild, 'thread.update', {
			description: `Thread **${thread.name}** (<#${thread.id}>) created in <#${thread.parentId}>.`
		});
	}
}
