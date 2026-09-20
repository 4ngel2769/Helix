/**
 * Base classes that give `chatInputRun`-only commands a working `messageRun`.
 *
 * `HybridCommand` / `HybridModuleCommand` parse the message body against the
 * command's own registered slash options and then run the exact same
 * `chatInputRun` logic through a message-backed interaction shim
 * (see `lib/utils/textCommandInteraction`). Prefix usage therefore stays in
 * lockstep with the slash definition — even for subcommands.
 */
import { Command } from '@sapphire/framework';
import { ModuleCommand as BaseModuleCommand, type Module } from '@kbotdev/plugin-modules';
import { EmbedBuilder, type ColorResolvable, type Message } from 'discord.js';
import config from '../../config';
import {
	buildUsageString,
	createTextCommandInteraction,
	getChatInputOptionData,
	ModalUnsupportedInTextError,
	parseTextArguments
} from '../utils/textCommandInteraction';

function usageEmbed(title: string, description: string, usage: string): EmbedBuilder {
	return new EmbedBuilder()
		.setColor(config.bot.embedColor.err as ColorResolvable)
		.setTitle(title)
		.setDescription(description)
		.addFields({ name: 'Usage', value: `\`\`\`\n${usage}\n\`\`\`` })
		.setTimestamp();
}

async function runAsText(command: Command, message: Message): Promise<unknown> {
	const data = getChatInputOptionData(command);
	const parsed = await parseTextArguments(command, message, data);

	if (!parsed.ok) {
		return message.reply({ embeds: [usageEmbed('❌ Invalid usage', parsed.error, buildUsageString(command, data))] });
	}

	// The context argument is only used for cooldown buckets, which the shim has no equivalent for.
	const run = (command.chatInputRun as ((interaction: Command.ChatInputCommandInteraction) => Promise<unknown>) | undefined)?.bind(command);
	if (!run) throw new Error(`Command "${command.name}" has no chatInputRun to reuse for text usage.`);

	const interaction = createTextCommandInteraction(command, message, parsed);
	try {
		return await run(interaction);
	} catch (error) {
		if (error instanceof ModalUnsupportedInTextError) {
			return message.reply({ embeds: [usageEmbed('ℹ️ Slash command required', error.message, buildUsageString(command, data))] });
		}
		throw error;
	}
}

/** For plain `Command` pieces that only implemented `chatInputRun`. */
export abstract class HybridCommand extends Command {
	public override async messageRun(message: Message): Promise<unknown> {
		return runAsText(this, message);
	}
}

/** For `ModuleCommand` pieces that only implemented `chatInputRun`. */
export abstract class HybridModuleCommand<M extends Module = Module> extends BaseModuleCommand<M> {
	public override async messageRun(message: Message): Promise<unknown> {
		return runAsText(this, message);
	}
}
