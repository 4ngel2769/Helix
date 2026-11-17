import { Events, Listener } from '@sapphire/framework';
import type { GuildScheduledEvent } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class ScheduledEventCreateLogListener extends Listener<typeof Events.GuildScheduledEventCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) { super(context, { ...options, event: Events.GuildScheduledEventCreate }); }
	public override async run(event: GuildScheduledEvent) { if (!event.guild) return; await sendLog(event.guild, 'scheduledEvent.update', { title: 'Scheduled event created', description: `**${event.name}** (${event.id}) created.`, fields: [{ name: 'Starts', value: event.scheduledStartAt?.toISOString() ?? '*none*' }, { name: 'Location', value: event.entityMetadata?.location ?? (event.channelId ? `<#${event.channelId}>` : '*none*') }] }); }
}
