import { Events, Listener } from '@sapphire/framework';
import type { Role } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class RoleCreateLogListener extends Listener<typeof Events.GuildRoleCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildRoleCreate });
	}
	public override async run(role: Role) {
		await sendLog(role.guild, 'role.create', {
			description: `Role <@&${role.id}> (**${role.name}**) created.`
		});
	}
}
