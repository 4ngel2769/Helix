import { Events, Listener } from '@sapphire/framework';
import type { Role } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class RoleUpdateLogListener extends Listener<typeof Events.GuildRoleUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildRoleUpdate });
	}
	public override async run(oldRole: Role, newRole: Role) {
		const changes = [
			['Name', oldRole.name, newRole.name],
			['Color', oldRole.hexColor, newRole.hexColor],
			['Permissions', oldRole.permissions.bitfield.toString(), newRole.permissions.bitfield.toString()],
			['Hoisted', oldRole.hoist, newRole.hoist],
			['Mentionable', oldRole.mentionable, newRole.mentionable],
			['Displayed separately', oldRole.tags?.availableForPurchase, newRole.tags?.availableForPurchase]
		].filter(([, before, after]) => before !== after);
		if (changes.length === 0) return;
		await sendLog(newRole.guild, 'role.update', {
			description: `Role <@&${newRole.id}> updated.`,
			fields: changes.map(([name, before, after]) => ({ name: String(name), value: `Before: ${String(before)}\nAfter: ${String(after)}`, inline: false }))
		});
	}
}
