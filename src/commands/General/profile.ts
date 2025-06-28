import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { getGameStatsModel } from '../../models/GameStats';

@ApplyOptions<Command.Options>({
	name: 'profile',
	description: 'View your profile and game statistics.',
	fullCategory: ['General'],
	enabled: true
})
export class ProfileCommand extends ModuleCommand<GeneralModule> {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder.setName(this.name).setDescription(this.description).setIntegrationTypes(0, 1).setContexts(0, 1, 2)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const userId = interaction.user.id;

		try {
			const gameStatsModel = getGameStatsModel('userdb');
			let userStats = await gameStatsModel.findOne({ userId });

			// Initialize stats if not present
			if (!userStats) {
				userStats = await gameStatsModel.create({
					userId,
					gameStats: {
						multiplayer: {
							tictactoe: { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 }
						},
						singleplayer: {
							tictactoe: { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 }
						}
					}
				});
			}

			const multiplayerStats = userStats.gameStats.multiplayer.tictactoe || { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 };
			const singleplayerStats = userStats.gameStats.singleplayer.tictactoe || { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 };

			const embed = new EmbedBuilder()
				.setTitle(`${interaction.user.username}'s Profile`)
				.setDescription('Here are your game statistics:')
				.addFields(
					{
						name: 'Multiplayer Tic Tac Toe',
						value: `Wins: ${multiplayerStats.wins}\nLosses: ${multiplayerStats.losses}\nDraws: ${multiplayerStats.draws}\nGames Played: ${multiplayerStats.gamesPlayed}`,
						inline: true
					},
					{
						name: 'Singleplayer Tic Tac Toe',
						value: `Wins: ${singleplayerStats.wins}\nLosses: ${singleplayerStats.losses}\nDraws: ${singleplayerStats.draws}\nGames Played: ${singleplayerStats.gamesPlayed}`,
						inline: true
					}
				)
				.setFooter({ text: 'Your profile is based on global stats.' });

			return interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error('Error fetching profile data:', error);
			return interaction.reply({
				content: 'An error occurred while fetching your profile. Please try again later.',
				ephemeral: true
			});
		}
	}
}
