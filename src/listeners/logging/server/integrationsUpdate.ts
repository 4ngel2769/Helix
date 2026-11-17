import { Events, Listener } from '@sapphire/framework';
import type { Guild } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class IntegrationsUpdateLogListener extends Listener<typeof Events.GuildIntegrationsUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) { super(context, { ...options, event: Events.GuildIntegrationsUpdate }); }
	public override async run(guild: Guild) { await sendLog(guild, 'integration.update', { description: 'Discord reported that server integrations changed. The gateway notification does not include the individual integration details.' }); }
}
