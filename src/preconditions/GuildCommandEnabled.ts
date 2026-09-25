import { AllFlowsPrecondition, type Command } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';
import { loadGuildFlags, loadUserBanned } from '../lib/utils/flagCache';
import { isCommandDisabled } from '../lib/utils/disabledCommandsCache';
import { t, supportVars, type MessageKey } from '../lib/i18n';
import { getGuildStrings } from '../lib/i18n/guildStrings';

export const DEFAULT_DISABLED_MESSAGE_KEY: MessageKey = 'error.guild.disabled';

async function check(guildId: string, userId: string, commandName: string): Promise<MessageKey | null> {
	// Single cached lookup — no DB on hits.
	const flags = await loadGuildFlags(guildId);
	if (flags.banned) return 'error.guild.banned';
	// A disabled guild always blocks; whether the admin's own `disabledMessage`
	// is used instead of the localized default is decided in `guard`.
	if (flags.disabled) return DEFAULT_DISABLED_MESSAGE_KEY;
	if (await isCommandDisabled(guildId, commandName)) return 'error.command.disabled';
	if (await loadUserBanned(userId)) return 'error.user.banned';
	return null;
}

/**
 * Global guard (appended to every command at startup, see listeners/ready.ts):
 * owner kill-switches (banned/disabled guilds, banned users) + per-guild
 * `disabledCommands` (dashboard + /togglecommand). Flag checks are cached
 * in-memory, so commands pay no extra database latency.
 *
 * Messages go through the locale/kit chain, so a French guild sees a French
 * denial. An admin-authored `disabledMessage` still wins verbatim — the same
 * precedence it had before, minus the blank-reply case.
 */
export class GuildCommandEnabledPrecondition extends AllFlowsPrecondition {
	private async guard(guildId: string | null, userId: string, command: Command) {
		if (!guildId) return this.ok();
		const key = await check(guildId, userId, command.name);
		if (!key) return this.ok();

		if (key === DEFAULT_DISABLED_MESSAGE_KEY) {
			const flags = await loadGuildFlags(guildId);
			if (flags.message) return this.error({ message: flags.message });
		}

		const vars = { command: command.name, ...supportVars() };
		return this.error({ message: t(key, await getGuildStrings(guildId), vars) });
	}

	public override async messageRun(message: Message, command: Command) {
		return this.guard(message.guildId, message.author.id, command);
	}

	public override async chatInputRun(interaction: CommandInteraction, command: Command) {
		return this.guard(interaction.guildId, interaction.user.id, command);
	}

	public override async contextMenuRun(interaction: ContextMenuCommandInteraction, command: Command) {
		return this.guard(interaction.guildId, interaction.user.id, command);
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		GuildCommandEnabled: never;
	}
}
