import { Events, Listener } from '@sapphire/framework';
import type { VoiceState } from 'discord.js';
import { sendLog } from '../../lib/logging/logService';

export class VoiceStateUpdateListener extends Listener<typeof Events.VoiceStateUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.VoiceStateUpdate });
	}

	public override async run(oldState: VoiceState, newState: VoiceState) {
		const member = newState.member ?? oldState.member;
		if (!member) return;
		const tag = member.user.tag;
		const oldId = oldState.channelId;
		const newId = newState.channelId;
		if (oldId === newId) return; // mute/deafen toggles — skip noise

		if (!oldId && newId) {
			await sendLog(newState.guild, 'voice.join', {
				description: `**${tag}** (<@${member.id}>) joined <#${newId}>.`,
				targetId: member.id,
				isBot: member.user.bot
			});
		} else if (oldId && !newId) {
			await sendLog(newState.guild, 'voice.leave', {
				description: `**${tag}** (<@${member.id}>) left <#${oldId}>.`,
				targetId: member.id,
				isBot: member.user.bot
			});
		} else if (oldId && newId) {
			await sendLog(newState.guild, 'voice.move', {
				description: `**${tag}** (<@${member.id}>) moved from <#${oldId}> to <#${newId}>.`,
				targetId: member.id,
				isBot: member.user.bot
			});
		}
	}
}
