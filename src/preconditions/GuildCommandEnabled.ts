import { AllFlowsPrecondition, type Command } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';
import { isCommandDisabled } from '../lib/utils/disabledCommandsCache';

/**
 * Global guard: blocks commands listed in the guild's `disabledCommands`
 * (managed via /togglecommand or the dashboard General page).
 * Appended to every command at startup (see listeners/ready.ts).
 */
export class GuildCommandEnabledPrecondition extends AllFlowsPrecondition {
	public override async messageRun(message: Message, command: Command) {
		if (!message.guildId) return this.ok();
		if (await isCommandDisabled(message.guildId, command.name)) {
			return this.error({ message: `The command \`${command.name}\` is disabled in this server.` });
		}
		return this.ok();
	}

	public override async chatInputRun(interaction: CommandInteraction, command: Command) {
		if (!interaction.guildId) return this.ok();
		if (await isCommandDisabled(interaction.guildId, command.name)) {
			return this.error({ message: `The command \`${command.name}\` is disabled in this server.` });
		}
		return this.ok();
	}

	public override async contextMenuRun(interaction: ContextMenuCommandInteraction, command: Command) {
		if (!interaction.guildId) return this.ok();
		if (await isCommandDisabled(interaction.guildId, command.name)) {
			return this.error({ message: `The command \`${command.name}\` is disabled in this server.` });
		}
		return this.ok();
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		GuildCommandEnabled: never;
	}
}
