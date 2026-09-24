import type { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../config';
import { getChatInputOptionData } from './textCommandInteraction';

export function commandHelpEmbed(command: Command, summary: string): EmbedBuilder {
	const options = getChatInputOptionData(command) ?? [];
	const fields = options.flatMap((option) => {
		if (option.type === 1) {
			return [{ name: `/${command.name} ${option.name}`, value: option.description || 'No description available.' }];
		}
		if (option.type === 2) {
			return [{
				name: `/${command.name} ${option.name}`,
				value: (option.options ?? []).map((child) => `\`${child.name}\``).join(', ') || option.description || 'No options available.'
			}];
		}
		return [];
	});

	return new EmbedBuilder()
		.setColor(config.bot.embedColor.default as ColorResolvable)
		.setTitle(`/${command.name} command help`)
		.setDescription(summary)
		.addFields(fields);
}
