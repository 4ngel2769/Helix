import { Events, Listener } from '@sapphire/framework';
import type { Guild, Invite } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class InviteCreateLogListener extends Listener<typeof Events.InviteCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.InviteCreate });
	}
	public override async run(invite: Invite) {
		if (!invite.guild || !('channels' in invite.guild)) return;
		const guild = invite.guild as Guild;
		await sendLog(guild, 'invite.create', {
			description: `Invite \`${invite.code}\` created${invite.inviter ? ` by **${invite.inviter.tag}**` : ''} for <#${invite.channelId}>.`,
			actorId: invite.inviter?.id
		});
	}
}
