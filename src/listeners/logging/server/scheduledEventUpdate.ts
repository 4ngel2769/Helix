import { Events, Listener } from '@sapphire/framework';
import type { GuildScheduledEvent } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class ScheduledEventUpdateLogListener extends Listener<typeof Events.GuildScheduledEventUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) { super(context, { ...options, event: Events.GuildScheduledEventUpdate }); }
	public override async run(oldEvent: GuildScheduledEvent | null, event: GuildScheduledEvent) {
		if (!oldEvent || !event.guild) return;
		const changes = [['Name', oldEvent.name, event.name], ['Description', oldEvent.description, event.description], ['Status', oldEvent.status, event.status], ['Start', oldEvent.scheduledStartAt?.toISOString(), event.scheduledStartAt?.toISOString()], ['End', oldEvent.scheduledEndAt?.toISOString(), event.scheduledEndAt?.toISOString()], ['Channel', oldEvent.channelId, event.channelId]].filter(([, before, after]) => before !== after);
		if (!changes.length) return;
		await sendLog(event.guild, 'scheduledEvent.update', { title: 'Scheduled event updated', description: `**${event.name}** (${event.id}) updated.`, fields: changes.map(([name, before, after]) => ({ name: String(name), value: `Before: ${String(before ?? '*none*')}\nAfter: ${String(after ?? '*none*')}` })) });
	}
}
