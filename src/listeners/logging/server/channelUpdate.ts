import { Events, Listener } from '@sapphire/framework';
import { sendLog } from '../../../lib/logging/logService';
import { guildChannel, type MaybeGuildChannel } from './_shared';

export class ChannelUpdateLogListener extends Listener<typeof Events.ChannelUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.ChannelUpdate });
	}
	public override async run(oldChannel: MaybeGuildChannel, newChannel: MaybeGuildChannel) {
		const gc = guildChannel(newChannel);
		if (!gc) return;
		const oldName = 'name' in oldChannel ? (oldChannel.name as string) : null;
		if (oldName === gc.name) return; // permission overwrites etc. — skip noise for now
		await sendLog(gc.guild, 'channel.update', {
			description: `Channel <#${gc.id}> renamed.`,
			fields: [
				{ name: 'Before', value: oldName ?? '*unknown*', inline: true },
				{ name: 'After', value: gc.name, inline: true }
			]
		});
	}
}
