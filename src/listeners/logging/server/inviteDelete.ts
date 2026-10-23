import { Events, Listener } from '@sapphire/framework';
import type { Guild, Invite } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class InviteDeleteLogListener extends Listener<typeof Events.InviteDelete> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.InviteDelete });
	}
	public override async run(invite: Invite) {
		if (!invite.guild || !('channels' in invite.guild)) return;
		await sendLog(invite.guild as Guild, 'invite.delete', {
			description: `Invite \`${invite.code}\` deleted.`
		});
	}
}
