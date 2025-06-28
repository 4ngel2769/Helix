import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { getGameStatsModel } from '../../models/GameStats';

@ApplyOptions<Command.Options>({
    name: 'leaderboard',
    description: 'View the leaderboard for a specific game.',
    fullCategory: ['Fun'],
    enabled: true
})
export class LeaderboardCommand extends ModuleCommand<FunModule> {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setIntegrationTypes(0, 1)
                .setContexts(0, 1, 2)
                .addStringOption((option) =>
                    option
                        .setName('game')
                        .setDescription('The game to view the leaderboard for')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        );
    }

    public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
        const games = ['tictactoe']; // will make this dynamyc later
        // for now, we have a static list of games
        const input = interaction.options.getFocused().toLowerCase();
        const filtered = games.filter((name) => name.toLowerCase().includes(input)).slice(0, 25);

        return interaction.respond(filtered.map((name) => ({ name, value: name })));
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const gameName = interaction.options.getString('game', true);

        try {
            const gameStatsModel = getGameStatsModel('userdb');
            const topPlayers = await gameStatsModel
                .find({ [`gameStats.multiplayer.${gameName}`]: { $exists: true } })
                .sort({ [`gameStats.multiplayer.${gameName}.wins`]: -1 })
                .limit(10)
                .lean();

            // Bot wins is an aggregation of player losses in singleplayer
            const botWinsAgg = await gameStatsModel.aggregate([
                { $group: { _id: null, botWins: { $sum: `$gameStats.singleplayer.${gameName}.losses` } } }
            ]);
            const botWins = botWinsAgg[0]?.botWins ?? 0;

            const leaderboardText =
                topPlayers
                    .map(
                        (player, index) => {
                            const stats = player.gameStats?.multiplayer?.[gameName] ?? {};
                            const wins = stats.wins ?? 0;
                            return `**${index + 1}.** <@${player.userId}> - **${wins} Wins**`;
                        }
                    )
                    .join('\n') || 'No players found.';

            const embed = new EmbedBuilder()
                .setTitle(`Leaderboard for ${gameName}`)
                .setDescription(
                    leaderboardText +
                    `\n\n__Bot Stats__\n🤖 **Bot Wins (vs players): ${botWins}**`
                )
                .setFooter({ text: 'Leaderboard is based on global stats.' });

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching leaderboard data:', error);
            return interaction.reply({
                content: 'An error occurred while fetching the leaderboard. Please try again later.',
                ephemeral: true
            });
        }
    }
}