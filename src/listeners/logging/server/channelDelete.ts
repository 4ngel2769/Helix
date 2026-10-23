import { Events, Listener } from '@sapphire/framework';
import { sendLog } from '../../../lib/logging/logService';
import { guildChannel, type MaybeGuildChannel } from './_shared';

export class ChannelDeleteLogListener extends Listener<typeof Events.ChannelDelete> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.ChannelDelete });
	}
	public override async run(channel: MaybeGuildChannel) {
		const gc = guildChannel(channel);
		if (!gc) return;
		await sendLog(gc.guild, 'channel.delete', {
			description: `Channel **${gc.name}** (${gc.id}) deleted.`
		});
	}
}
