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
		const fields = [
			{ name: 'Type', value: gc.type.toString(), inline: true },
			...(gc.parentId ? [{ name: 'Category', value: gc.parentId, inline: true }] : []),
			...('topic' in gc && gc.topic ? [{ name: 'Topic', value: gc.topic, inline: false }] : []),
			...('rateLimitPerUser' in gc ? [{ name: 'Slowmode', value: `${gc.rateLimitPerUser}s`, inline: true }] : []),
			...('bitrate' in gc ? [{ name: 'Bitrate', value: `${Math.round(gc.bitrate / 1000)} kbps`, inline: true }] : []),
			...('userLimit' in gc ? [{ name: 'User limit', value: gc.userLimit === 0 ? 'Unlimited' : String(gc.userLimit), inline: true }] : [])
		];
		await sendLog(gc.guild, 'channel.delete', {
			description: `Channel **${gc.name}** (${gc.id}) deleted.`,
			fields
		});
	}
}
