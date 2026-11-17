import { Events, Listener } from '@sapphire/framework';
import type { AnyThreadChannel } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class ThreadUpdateLogListener extends Listener<typeof Events.ThreadUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) { super(context, { ...options, event: Events.ThreadUpdate }); }
	public override async run(oldThread: AnyThreadChannel, thread: AnyThreadChannel) {
		const changes = [['Name', oldThread.name, thread.name], ['Archived', oldThread.archived, thread.archived], ['Locked', oldThread.locked, thread.locked], ['Slowmode', oldThread.rateLimitPerUser, thread.rateLimitPerUser], ['Auto-archive', oldThread.autoArchiveDuration, thread.autoArchiveDuration]].filter(([, before, after]) => before !== after);
		if (!changes.length) return;
		await sendLog(thread.guild, 'thread.update', { description: `Thread <#${thread.id}> updated.`, fields: changes.map(([name, before, after]) => ({ name: String(name), value: `Before: ${String(before)}\nAfter: ${String(after)}`, inline: false })) });
	}
}
