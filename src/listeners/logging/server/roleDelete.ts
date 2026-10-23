import { Events, Listener } from '@sapphire/framework';
import type { Role } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class RoleDeleteLogListener extends Listener<typeof Events.GuildRoleDelete> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildRoleDelete });
	}
	public override async run(role: Role) {
		await sendLog(role.guild, 'role.delete', {
			description: `Role **${role.name}** (${role.id}) deleted.`
		});
	}
}
