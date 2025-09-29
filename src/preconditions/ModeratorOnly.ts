import { Precondition } from '@sapphire/framework';
import type { Message } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { GuildMember } from 'discord.js';

export class ModeratorOnlyPrecondition extends Precondition {
    public override async messageRun(message: Message) {
        return this.checkModerator(message.member?.permissions.has('ModerateMembers'));
    }

    public override async chatInputRun(interaction: ChatInputCommandInteraction) {
        const member = interaction.member as GuildMember;
        return this.checkModerator(member?.permissions?.has('ModerateMembers'));
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