import { Precondition } from '@sapphire/framework';
import { PermissionFlagsBits, type Message, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';
import { Guild } from '../models/Guild';

export class ModeratorOnlyPrecondition extends Precondition {
	public override async messageRun(message: Message) {
		return this.checkMember(message.member, message.guildId);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		if (!interaction.inGuild() || !interaction.member) return this.error({ message: 'This command can only be used in a server.' });
		return this.checkMember(interaction.member as GuildMember, interaction.guildId);
	}

	private async checkMember(member: GuildMember | null | undefined, guildId: string | null) {
		if (member?.permissions.has(PermissionFlagsBits.ModerateMembers)) return this.ok();
		if (member && guildId) {
			const guildData = await Guild.findOne({ guildId }, { adminRoleId: 1, modRoleId: 1 }).lean().catch(() => null);
			if (guildData?.adminRoleId && member.roles.cache.has(guildData.adminRoleId)) return this.ok();
			if (guildData?.modRoleId && member.roles.cache.has(guildData.modRoleId)) return this.ok();
		}
		return this.error({ message: 'Only moderators can use this command!' });
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		ModeratorOnly: never;
	}
}
