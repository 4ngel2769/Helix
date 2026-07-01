import { Precondition } from '@sapphire/framework';
import type { Message, ChatInputCommandInteraction, GuildMember } from 'discord.js';

export class ModeratorOnlyPrecondition extends Precondition {
    public override async messageRun(message: Message) {
        return this.checkModerator(message.member?.permissions.has('ModerateMembers'));
    }

    public override async chatInputRun(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild() || !interaction.member) {
            return this.error({ message: 'This command can only be used in a server.' });
        }
        const member = interaction.member as GuildMember;
        return this.checkModerator(member.permissions.has('ModerateMembers'));
    }

    private checkModerator(hasPermission: boolean | undefined) {
        return hasPermission
            ? this.ok()
            : this.error({ message: 'Only moderators can use this command!' });
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        ModeratorOnly: never;
    }
} 