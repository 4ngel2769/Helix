import { AllFlowsPrecondition, container, type Command } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';
import config from '../config';
import { loadGuildFlags, loadUserBanned } from '../lib/utils/flagCache';
import { isCommandDisabled } from '../lib/utils/disabledCommandsCache';

export const DEFAULT_DISABLED_MESSAGE =
	'Helix is disabled in this server, to learn more contact the support team in {{supportServer.name}} ({{supportServer.invite}})';

export function renderSupportPlaceholders(template: string): string {
	const supportGuild = config.support.serverId ? container.client.guilds.cache.get(config.support.serverId) : undefined;
	return template
		.replaceAll('{{supportServer.name}}', supportGuild?.name ?? 'the support server')
		.replaceAll('{{supportServer.count}}', String(supportGuild?.memberCount ?? '?'))
		.replaceAll('{{supportServer.invite}}', config.support.invite);
}

async function check(guildId: string | null, userId: string, commandName: string) {
	if (guildId) {
		// Single cached lookup — no DB on hits.
		const flags = await loadGuildFlags(guildId);
		if (flags.banned) return { blocked: 'Helix is banned in this server.' };
		if (flags.disabled) return { blocked: renderSupportPlaceholders(flags.message || DEFAULT_DISABLED_MESSAGE) };
		if (await isCommandDisabled(guildId, commandName)) {
			return { blocked: `The command \`${commandName}\` is disabled in this server.` };
		}
	}
	if (await loadUserBanned(userId)) {
		return { blocked: 'You are banned from using Helix.' };
	}
	return null;
}

/**
 * Global guard (appended to every command at startup, see listeners/ready.ts):
 * owner kill-switches (banned/disabled guilds, banned users) + per-guild
 * `disabledCommands` (dashboard + /togglecommand). Flag checks are cached
 * in-memory, so commands pay no extra database latency.
 */
export class GuildCommandEnabledPrecondition extends AllFlowsPrecondition {
	public override async messageRun(message: Message, command: Command) {
		if (!message.guildId) return this.ok();
		const hit = await check(message.guildId, message.author.id, command.name);
		return hit ? this.error({ message: hit.blocked }) : this.ok();
	}

	public override async chatInputRun(interaction: CommandInteraction, command: Command) {
		if (!interaction.guildId) return this.ok();
		const hit = await check(interaction.guildId, interaction.user.id, command.name);
		return hit ? this.error({ message: hit.blocked }) : this.ok();
	}

	public override async contextMenuRun(interaction: ContextMenuCommandInteraction, command: Command) {
		if (!interaction.guildId) return this.ok();
		const hit = await check(interaction.guildId, interaction.user.id, command.name);
		return hit ? this.error({ message: hit.blocked }) : this.ok();
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		GuildCommandEnabled: never;
	}
}
