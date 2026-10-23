import { Events, Listener } from '@sapphire/framework';
import type { AnyThreadChannel } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class ThreadDeleteLogListener extends Listener<typeof Events.ThreadDelete> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.ThreadDelete });
	}
	public override async run(thread: AnyThreadChannel) {
		if (!thread.guild) return;
		await sendLog(thread.guild, 'thread.update', {
			description: `Thread **${thread.name}** (${thread.id}) deleted.`
		});
	}
}
