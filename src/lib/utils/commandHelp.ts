import type { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../config';
import { getChatInputOptionData } from './textCommandInteraction';

export function commandHelpEmbed(command: Command, summary: string): EmbedBuilder {
	const options = getChatInputOptionData(command) ?? [];
	const subcommands = options.filter((option) => option.type === 1);
	const fields = subcommands.length
		? subcommands.map((option) => ({
				name: `/${command.name} ${option.name}`,
				value: option.description || 'No description available.'
			}))
		: [{ name: 'Usage', value: `/${command.name}` }];

	return new EmbedBuilder()
		.setColor(config.bot.embedColor.default as ColorResolvable)
		.setTitle(`/${command.name} command help`)
		.setDescription(summary)
		.addFields(fields);
}
