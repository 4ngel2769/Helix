import { Events, Listener } from '@sapphire/framework';
import type { Role } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class RoleUpdateLogListener extends Listener<typeof Events.GuildRoleUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildRoleUpdate });
	}
	public override async run(oldRole: Role, newRole: Role) {
		if (oldRole.name === newRole.name && oldRole.hexColor === newRole.hexColor) return;
		await sendLog(newRole.guild, 'role.update', {
			description: `Role <@&${newRole.id}> updated.`,
			fields: [
				{ name: 'Before', value: `${oldRole.name} (${oldRole.hexColor})`, inline: true },
				{ name: 'After', value: `${newRole.name} (${newRole.hexColor})`, inline: true }
			]
		});
	}
}
