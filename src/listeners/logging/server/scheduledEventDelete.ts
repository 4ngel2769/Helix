import { Events, Listener } from '@sapphire/framework';
import type { GuildScheduledEvent, PartialGuildScheduledEvent } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class ScheduledEventDeleteLogListener extends Listener<typeof Events.GuildScheduledEventDelete> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) { super(context, { ...options, event: Events.GuildScheduledEventDelete }); }
	public override async run(event: GuildScheduledEvent | PartialGuildScheduledEvent) { const guild = event.guild; if (!guild) return; await sendLog(guild, 'scheduledEvent.update', { title: 'Scheduled event deleted', description: `**${event.name ?? 'Unknown event'}** (${event.id}) deleted.` }); }
}
