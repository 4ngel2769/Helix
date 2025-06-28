import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    User,
    MessageFlags
} from 'discord.js';
import { getGameStatsModel } from '../../models/GameStats';
import { getReplayRow } from '../../components/GameControls';

@ApplyOptions<Command.Options>({
    enabled: true,
    nsfw: false,
    name: 'game',
    description: 'Play a game!',
    detailedDescription: 'Play various games like Tic Tac Toe.',
    fullCategory: ['Fun'],
    cooldownDelay: 5000,
    cooldownLimit: 3
})
export class GameCommand extends ModuleCommand<FunModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            description: 'Play a game!',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setIntegrationTypes(0, 1)
                .setContexts(0, 1, 2)
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('tictactoe')
                        .setDescription('Play Tic Tac Toe!')
                        .addUserOption((option) =>
                            option
                                .setName('user')
                                .setDescription('The user to play against (leave empty to play against the bot)')
                                .setRequired(false)
                        )
                )
        );
    }

    public override async chatInputRun(interaction: ModuleCommand.ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'tictactoe':
                return this.handleTicTacToe(interaction);
            default:
                return interaction.reply({ content: 'Unknown subcommand.', flags: MessageFlags.Ephemeral });
        }
    }

    private async handleTicTacToe(interaction: ModuleCommand.ChatInputCommandInteraction) {
        const opponent = interaction.options.getUser('user');
        const isDM = !interaction.guild;

        // Always start singleplayer if no opponent
        if (!opponent) {
            const botUser = interaction.client.user!;
            return this.startSinglePlayerGame(interaction, interaction.user, botUser);
        }

        if (opponent.bot) {
            return interaction.reply({ content: 'You cannot play against a bot.', flags: MessageFlags.Ephemeral });
        }

        return this.startMultiplayerGame(interaction, interaction.user, opponent);
    }

    private async startSinglePlayerGame(
        interaction: ModuleCommand.ChatInputCommandInteraction,
        player: User,
        bot: User
    ) {
        const gameStatsModel = getGameStatsModel('userdb');
        const playerId = player.id;

        // Initialize stats if not already present
        await gameStatsModel.updateOne(
            { userId: playerId },
            { $setOnInsert: { gameStats: { singleplayer: { tictactoe: { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 } } } } },
            { upsert: true }
        );

        const board: string[][] = [
            ['⬜', '⬜', '⬜'],
            ['⬜', '⬜', '⬜'],
            ['⬜', '⬜', '⬜']
        ];
        let currentPlayer = player;

        const createGameEmbed = (status = `It's ${currentPlayer.username}'s turn!`): EmbedBuilder => {
            return new EmbedBuilder()
                .setTitle('Tic Tac Toe')
                .setDescription(board.map(row => row.join(' ')).join('\n'))
                .setFooter({ text: status });
        };

        const createGameButtons = (): ActionRowBuilder<ButtonBuilder>[] => {
            return board.map((row, rowIndex) =>
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    row.map((cell, colIndex) =>
                        new ButtonBuilder()
                            .setCustomId(`${rowIndex}-${colIndex}`)
                            .setLabel(cell)
                            .setStyle(cell === '⬜' ? ButtonStyle.Secondary : ButtonStyle.Primary)
                            .setDisabled(cell !== '⬜')
                    )
                )
            ).concat(
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId('withdraw')
                        .setLabel('Withdraw')
                        .setStyle(ButtonStyle.Danger)
                )
            );
        };

        const checkWinner = (): string | null => {
            // Check rows and columns
            for (let i = 0; i < 3; i++) {
                if (board[i][0] !== '⬜' && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
                    return board[i][0];
                }
                if (board[0][i] !== '⬜' && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
                    return board[0][i];
                }
            }

            // Check diagonals
            if (board[0][0] !== '⬜' && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
                return board[0][0];
            }
            if (board[0][2] !== '⬜' && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
                return board[0][2];
            }

            return null;
        };

        const isBoardFull = (): boolean => {
            return board.every(row => row.every(cell => cell !== '⬜'));
        };

        const botMove = (): void => {
            // Check if bot can win
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    if (board[i][j] === '⬜') {
                        board[i][j] = '⭕';
                        if (checkWinner() === '⭕') return;
                        board[i][j] = '⬜';
                    }
                }
            }

            // Check if bot needs to block player
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    if (board[i][j] === '⬜') {
                        board[i][j] = '❌';
                        if (checkWinner() === '❌') {
                            board[i][j] = '⭕';
                            return;
                        }
                        board[i][j] = '⬜';
                    }
                }
            }

            // Make a random move
            const emptyCells: [number, number][] = [];
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    if (board[i][j] === '⬜') emptyCells.push([i, j]);
                }
            }
            const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            board[row][col] = '⭕';
        };

        const embed = createGameEmbed();
        const components = createGameButtons();

        await interaction.reply({ embeds: [embed], components });
        const message = await interaction.fetchReply();

        let timeout: NodeJS.Timeout;

        const resetTimer = () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(async () => {
                collector.stop('timeout');
            }, 300000);
        };

        resetTimer();

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button
        });

        collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
            if (buttonInteraction.customId === 'withdraw') {
                collector.stop('withdraw');
                return;
            }

            if (buttonInteraction.user.id !== player.id) {
                return buttonInteraction.reply({ content: 'This is not your game!', ephemeral: true });
            }

            const [row, col] = buttonInteraction.customId.split('-').map(Number);

            if (board[row][col] !== '⬜') {
                return buttonInteraction.reply({ content: 'This spot is already taken!', ephemeral: true });
            }

            board[row][col] = '❌';

            const winner = checkWinner();
            if (winner) {
                collector.stop('win');
                return;
            }

            if (isBoardFull()) {
                collector.stop('draw');
                return;
            }

            botMove();

            const botWinner = checkWinner();
            if (botWinner) {
                collector.stop('loss');
                return;
            }

            if (isBoardFull()) {
                collector.stop('draw');
                return;
            }

            resetTimer();

            await buttonInteraction.update({
                embeds: [createGameEmbed()],
                components: createGameButtons()
            });
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'timeout') {
                await interaction.editReply({
                    embeds: [createGameEmbed('The game ended in a draw due to inactivity.')],
                    components: []
                });
            } else if (reason === 'withdraw') {
                await gameStatsModel.updateOne(
                    { userId: player.id },
                    { $inc: { 'gameStats.singleplayer.tictactoe.losses': 1, 'gameStats.singleplayer.tictactoe.gamesPlayed': 1 } }
                );
                await interaction.editReply({
                    embeds: [createGameEmbed('You withdrew from the game. The bot wins!')],
                    components: []
                });
            } else if (reason === 'win') {
                await gameStatsModel.updateOne(
                    { userId: player.id },
                    { $inc: { 'gameStats.singleplayer.tictactoe.wins': 1, 'gameStats.singleplayer.tictactoe.gamesPlayed': 1 } }
                );
                await interaction.editReply({
                    embeds: [createGameEmbed(`${player.username} wins!`)],
                    components: []
                });
            } else if (reason === 'loss') {
                await gameStatsModel.updateOne(
                    { userId: player.id },
                    { $inc: { 'gameStats.singleplayer.tictactoe.losses': 1, 'gameStats.singleplayer.tictactoe.gamesPlayed': 1 } }
                );
                await interaction.editReply({
                    embeds: [createGameEmbed('The bot wins!')],
                    components: []
                });
            } else if (reason === 'draw') {
                await gameStatsModel.updateOne(
                    { userId: player.id },
                    { $inc: { 'gameStats.singleplayer.tictactoe.draws': 1, 'gameStats.singleplayer.tictactoe.gamesPlayed': 1 } }
                );
                await interaction.editReply({
                    embeds: [createGameEmbed('It\'s a draw!')],
                    components: []
                });
            }

            await interaction.editReply({
                embeds: [createGameEmbed('Game over!')],
                components: [getReplayRow()]
            });

            const replayMsg = await interaction.fetchReply();
            const replayCollector = replayMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 15000 // 15 seconds
            });

            let replayInitiator: string | null = null;

            replayCollector.on('collect', async (btn) => {
                const allowedIds = [player.id];
                if (!allowedIds.includes(btn.user.id)) {
                    return btn.reply({ content: 'You did not play this game.', ephemeral: true });
                }

                if (replayInitiator && btn.user.id !== replayInitiator) {
                    replayCollector.stop('accepted');
                    await btn.update({ content: 'Starting a new game...', components: [] });
                    await this.startSinglePlayerGame(interaction, player, interaction.client.user);
                    return;
                }

                replayInitiator = btn.user.id;
                await btn.update({
                    embeds: [createGameEmbed(`${btn.user.username} wants a rematch! Waiting for you to accept...`)],
                    components: [
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setCustomId('replay')
                                .setLabel('Accept Replay')
                                .setStyle(ButtonStyle.Success)
                        )
                    ]
                });
            });

            replayCollector.on('end', async (_, reason) => {
                if (reason !== 'accepted') {
                    await interaction.editReply({
                        embeds: [createGameEmbed('Game over!')],
                        components: []
                    });
                }
            });
        });
    }

    private async startMultiplayerGame(
        interaction: ModuleCommand.ChatInputCommandInteraction,
        player1: User,
        player2: User
    ) {
        const gameStatsModel = getGameStatsModel('userdb');
        const player1Id = player1.id;
        const player2Id = player2.id;

        const defaultStats = {
            wins: 0,
            losses: 0,
            draws: 0,
            gamesPlayed: 0
        };
        await gameStatsModel.updateOne(
            { userId: player1Id },
            { $setOnInsert: { 'gameStats.multiplayer.tictactoe': defaultStats } },
            { upsert: true }
        );
        await gameStatsModel.updateOne(
            { userId: player2Id },
            { $setOnInsert: { 'gameStats.multiplayer.tictactoe': defaultStats } },
            { upsert: true }
        );

        // Multiplayer game logic
        const board: string[][] = [
            ['⬜', '⬜', '⬜'],
            ['⬜', '⬜', '⬜'],
            ['⬜', '⬜', '⬜']
        ];
        let currentPlayer = Math.random() < 0.5 ? player1 : player2;

        const createGameEmbed = (status = `It's ${currentPlayer.username}'s turn!`): EmbedBuilder => {
            return new EmbedBuilder()
                .setTitle('Tic Tac Toe')
                .setDescription(board.map(row => row.join(' ')).join('\n'))
                .setFooter({ text: status });
        };

        const createGameButtons = (): ActionRowBuilder<ButtonBuilder>[] => {
            return board.map((row, rowIndex) =>
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    row.map((cell, colIndex) =>
                        new ButtonBuilder()
                            .setCustomId(`${rowIndex}-${colIndex}`)
                            .setLabel(cell) // Use the cell value (e.g., ⬜, ❌, ⭕) as the label
                            .setStyle(cell === '⬜' ? ButtonStyle.Secondary : ButtonStyle.Primary)
                            .setDisabled(cell !== '⬜') // Disable buttons for non-empty cells
                    )
                )
            );
        };

        const checkWinner = (): string | null => {
            // Check rows and columns
            for (let i = 0; i < 3; i++) {
                if (board[i][0] !== '⬜' && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
                    return board[i][0];
                }
                if (board[0][i] !== '⬜' && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
                    return board[0][i];
                }
            }

            // Check diagonals
            if (board[0][0] !== '⬜' && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
                return board[0][0];
            }
            if (board[0][2] !== '⬜' && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
                return board[0][2];
            }

            return null;
        };

        const isBoardFull = (): boolean => {
            return board.every(row => row.every(cell => cell !== '⬜'));
        };

        const embed = createGameEmbed();
        const components = createGameButtons();

        await interaction.reply({ embeds: [embed], components });
        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000 // 1 minute
        });

        collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
            if (![player1.id, player2.id].includes(buttonInteraction.user.id)) {
                return buttonInteraction.reply({
                    content: 'This is not your game! Start a new game with `/game tictactoe`.',
                    ephemeral: true
                });
            }

            if (buttonInteraction.user.id !== currentPlayer.id) {
                return buttonInteraction.reply({
                    content: 'It\'s not your turn! Please wait for your turn.',
                    ephemeral: true
                });
            }

            const [row, col] = buttonInteraction.customId.split('-').map(Number);

            if (board[row][col] !== '⬜') {
                return buttonInteraction.reply({ content: 'This spot is already taken!', ephemeral: true });
            }

            board[row][col] = currentPlayer === player1 ? '❌' : '⭕';
            currentPlayer = currentPlayer === player1 ? player2 : player1;

            const winner = checkWinner();
            if (winner) {
                collector.stop();
                const winnerId = winner === '❌' ? player1Id : player2Id;
                const loserId = winner === '❌' ? player2Id : player1Id;

                // Update stats in the db
                await gameStatsModel.updateOne(
                    { userId: winnerId },
                    { $inc: { 'gameStats.multiplayer.tictactoe.wins': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 } }
                );
                await gameStatsModel.updateOne(
                    { userId: loserId },
                    { $inc: { 'gameStats.multiplayer.tictactoe.losses': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 } }
                );

                return interaction.editReply({
                    embeds: [createGameEmbed(`${winner === '❌' ? player1.username : player2.username} wins!`)],
                    components: []
                });
            }

            if (isBoardFull()) {
                collector.stop();
                await gameStatsModel.updateOne(
                    { userId: player1Id },
                    { $inc: { 'gameStats.multiplayer.tictactoe.draws': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 } }
                );
                await gameStatsModel.updateOne(
                    { userId: player2Id },
                    { $inc: { 'gameStats.multiplayer.tictactoe.draws': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 } }
                );

                return interaction.editReply({
                    embeds: [createGameEmbed('It\'s a draw!')],
                    components: []
                });
            }

            await buttonInteraction.update({
                embeds: [createGameEmbed()],
                components: createGameButtons()
            });
        });

        collector.on('end', async () => {
            await interaction.editReply({
                embeds: [createGameEmbed('Game over!')],
                components: []
            });
        });
    }
}