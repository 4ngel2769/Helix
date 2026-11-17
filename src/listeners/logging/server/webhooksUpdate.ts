import { Events, Listener } from '@sapphire/framework';
import type { TextChannel, NewsChannel, VoiceChannel, ForumChannel, MediaChannel, GuildBasedChannel } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class WebhooksUpdateLogListener extends Listener<typeof Events.WebhooksUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) { super(context, { ...options, event: Events.WebhooksUpdate }); }
	public override async run(channel: TextChannel | NewsChannel | VoiceChannel | ForumChannel | MediaChannel) { await sendLog((channel as GuildBasedChannel).guild, 'webhook.update', { description: `Discord reported a webhook change in <#${channel.id}>. The gateway notification does not identify the webhook or the exact change.` }); }
}
