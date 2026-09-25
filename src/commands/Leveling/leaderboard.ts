import { ModuleCommand } from '@kbotdev/plugin-modules';
import { LevelingModule } from '../../modules/Leveling';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import { getGuildAutomation } from '../../lib/utils/guildAutomationCache';

import { HybridModuleCommand } from '../../lib/structures/HybridCommand';
import { emptyLeaderboardMessage, fetchTop, leaderboardEmbed } from '../../lib/utils/levelingEmbeds';

@ApplyOptions<Command.Options>({
	name: 'leaderboard',
	description: 'Top 10 most active members by XP in this server.',
	fullCategory: ['Leveling'],
	enabled: true
})
export class LeaderboardCommand extends HybridModuleCommand<LevelingModule> {
	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, {
			...options,
			module: 'Leveling',
			description: 'leaderboard command',
			enabled: true,
			nsfw: false,
			preconditions: ['ModuleEnabled']
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder.setName(this.name).setDescription(this.description).setIntegrationTypes(0, 1).setContexts(0, 1, 2)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		if (!interaction.guildId) {
			return interaction.reply({ content: 'Leaderboard only works inside a server.', flags: MessageFlags.Ephemeral });
		}
		try {
			const top = await fetchTop(interaction.guildId);
			if (top.length === 0) {
				const auto = await getGuildAutomation(interaction.guildId).catch(() => null);
				return interaction.reply({ content: emptyLeaderboardMessage(auto?.levelingModuleOn === true), flags: MessageFlags.Ephemeral });
			}
			return interaction.reply({ embeds: [leaderboardEmbed(interaction.guild, top)] });
		} catch (error) {
			this.container.logger.error('Error fetching leaderboard:', error);
			return interaction.reply({ content: 'Could not load the leaderboard right now.', flags: MessageFlags.Ephemeral });
		}
	}
}
