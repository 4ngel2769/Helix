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
			description: `Thread **${thread.name}** (<#${thread.id}>) created in <#${thread.parentId}>.`,
			fields: [
				{ name: 'Archived', value: thread.archived ? 'Yes' : 'No', inline: true },
				{ name: 'Locked', value: thread.locked ? 'Yes' : 'No', inline: true },
				{ name: 'Slowmode', value: `${thread.rateLimitPerUser}s`, inline: true },
				{ name: 'Auto-archive', value: `${thread.autoArchiveDuration} minutes`, inline: true }
			]
		});
	}
}
