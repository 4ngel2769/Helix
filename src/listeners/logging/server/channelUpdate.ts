import { Events, Listener } from '@sapphire/framework';
import { sendLog } from '../../../lib/logging/logService';
import { guildChannel, type MaybeGuildChannel } from './_shared';
import { getChannelChanges } from '../../../lib/logging/channelDiff';

export class ChannelUpdateLogListener extends Listener<typeof Events.ChannelUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.ChannelUpdate });
	}
	public override async run(oldChannel: MaybeGuildChannel, newChannel: MaybeGuildChannel) {
		const gc = guildChannel(newChannel);
		if (!gc) return;
		const old = guildChannel(oldChannel);
		if (!old) return;
		const changes = getChannelChanges(old, gc);
		if (changes.length === 0) return;
		await sendLog(gc.guild, 'channel.update', {
			description: `Channel <#${gc.id}> updated.`,
			fields: changes.map((change) => ({ name: change.name, value: `Before: ${change.before}\nAfter: ${change.after}`, inline: false }))
		});
	}
}
