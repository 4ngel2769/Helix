import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    Message,
    User
} from 'discord.js';
import { MessageFlags } from 'discord-api-types/v10';
import { getGameStatsModel } from '../../models/GameStats';
import { getGameControlRow, getReplayRow } from '../../components/GameControls';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import { safeDeferUpdate, safeEditReply, safeReply } from '../utils/interactionHelpers';

type TicTacToeInteraction = ModuleCommand.ChatInputCommandInteraction | ButtonInteraction;
type Board = string[][];

type SingleplayerOutcome = 'win' | 'loss' | 'draw' | 'withdraw' | 'timeout';

type MultiplayerMoveResult = 'win' | 'draw' | 'resign' | 'timeout';

const EMPTY_CELL = '⬜';
const PLAYER_MARK = '❌';
const BOT_MARK = '⭕';
const SINGLEPLAYER_TIMEOUT_MS = 300_000;
const MULTIPLAYER_TIMEOUT_MS = 60_000;
const DEFAULT_MULTIPLAYER_STATS = { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 };

function isBotProperlyInGuild(interaction: TicTacToeInteraction): boolean {
    if (!interaction.guild) {
        return true;
    }

    const botMember = interaction.guild.members.cache.get(interaction.client.user!.id);
    return !!botMember;
}

function createBotNotInServerEmbed(botUserId: string): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle('⚠️ Bot Not Properly Added')
        .setDescription(
            'This bot appears to be added as a user app instead of being properly invited to the server.\n\n' +
            '**For multiplayer games to work properly, the bot needs to be invited to the server.**\n\n' +
            '**How to fix:**\n' +
            '1. Ask a server admin to invite the bot properly\n' +
            '2. Use this invite link: [Invite Bot](https://discord.com/oauth2/authorize?client_id=' +
            `${botUserId}&permissions=2048&scope=bot)\n` +
            '3. Grant the bot "Send Messages" permissions\n\n' +
            '*Singleplayer games will still work, but messages will be ephemeral.*'
        )
        .setColor(0xFF6B35);
}

function createBoard(): Board {
    return Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => EMPTY_CELL));
}

function createGameEmbed(board: Board, status: string): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle('Tic Tac Toe')
        .setDescription(board.map((row) => row.join(' ')).join('\n'))
        .setFooter({ text: status });
}

function createGameButtons(board: Board, includeWithdraw = false): ActionRowBuilder<ButtonBuilder>[] {
    const rows = board.map((row, rowIndex) =>
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            row.map((cell, colIndex) =>
                new ButtonBuilder()
                    .setCustomId(`${rowIndex}-${colIndex}`)
                    .setLabel(cell)
                    .setStyle(cell === EMPTY_CELL ? ButtonStyle.Secondary : ButtonStyle.Primary)
                    .setDisabled(cell !== EMPTY_CELL)
            )
        )
    );

    if (!includeWithdraw) {
        return rows;
    }

    return [
        ...rows,
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('withdraw')
                .setLabel('Withdraw')
                .setStyle(ButtonStyle.Danger)
        )
    ];
}

function parseBoardCoordinate(customId: string): [number, number] | null {
    const [row, col] = customId.split('-').map(Number);
    if (Number.isNaN(row) || Number.isNaN(col) || row < 0 || row > 2 || col < 0 || col > 2) {
        return null;
    }

    return [row, col];
}

function checkWinner(board: Board): string | null {
    for (let i = 0; i < 3; i++) {
        if (board[i][0] !== EMPTY_CELL && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
            return board[i][0];
        }

        if (board[0][i] !== EMPTY_CELL && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
            return board[0][i];
        }
    }

    if (board[0][0] !== EMPTY_CELL && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
        return board[0][0];
    }

    if (board[0][2] !== EMPTY_CELL && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
        return board[0][2];
    }

    return null;
}

function isBoardFull(board: Board): boolean {
    return board.every((row) => row.every((cell) => cell !== EMPTY_CELL));
}

function getEmptyCells(board: Board): [number, number][] {
    const emptyCells: [number, number][] = [];

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            if (board[row][col] === EMPTY_CELL) {
                emptyCells.push([row, col]);
            }
        }
    }

    return emptyCells;
}

function playRandomBotMove(board: Board): void {
    const emptyCells = getEmptyCells(board);
    if (emptyCells.length === 0) {
        return;
    }

    const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    board[row][col] = BOT_MARK;
}

function tryPlaceWinningOrBlockingMove(board: Board, targetSymbol: '⭕' | '❌'): boolean {
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            if (board[row][col] !== EMPTY_CELL) {
                continue;
            }

            board[row][col] = targetSymbol;
            const isWinningSpot = checkWinner(board) === targetSymbol;
            board[row][col] = EMPTY_CELL;

            if (!isWinningSpot) {
                continue;
            }

            board[row][col] = BOT_MARK;
            return true;
        }
    }

    return false;
}

function botMove(board: Board): void {
    if (Math.random() < 0.15) {
        playRandomBotMove(board);
        return;
    }

    if (tryPlaceWinningOrBlockingMove(board, BOT_MARK)) {
        return;
    }

    if (tryPlaceWinningOrBlockingMove(board, PLAYER_MARK)) {
        return;
    }

    playRandomBotMove(board);
}

function getSingleplayerResultText(result: SingleplayerOutcome, player: User): string {
    switch (result) {
        case 'withdraw':
            return 'You withdrew from the game. The bot wins!';
        case 'win':
            return `${player.username} wins!`;
        case 'loss':
            return 'The bot wins!';
        case 'draw':
            return "It's a draw!";
        case 'timeout':
            return 'The game ended in a draw due to inactivity.';
    }
}

function getSingleplayerIncrements(result: SingleplayerOutcome): Record<string, number> {
    switch (result) {
        case 'win':
            return { 'gameStats.singleplayer.tictactoe.wins': 1, 'gameStats.singleplayer.tictactoe.gamesPlayed': 1 };
        case 'loss':
            return { 'gameStats.singleplayer.tictactoe.losses': 1, 'gameStats.singleplayer.tictactoe.gamesPlayed': 1 };
        case 'draw':
            return { 'gameStats.singleplayer.tictactoe.draws': 1, 'gameStats.singleplayer.tictactoe.gamesPlayed': 1 };
        case 'withdraw':
            return { 'gameStats.singleplayer.tictactoe.losses': 1, 'gameStats.singleplayer.tictactoe.gamesPlayed': 1 };
        default:
            return {};
    }
}

async function incrementSingleplayerStats(
    gameStatsModel: ReturnType<typeof getGameStatsModel>,
    userId: string,
    result: SingleplayerOutcome
): Promise<void> {
    const increments = getSingleplayerIncrements(result);
    if (!Object.keys(increments).length) {
        return;
    }

    await gameStatsModel.updateOne({ userId }, { $inc: increments }, { upsert: true });
}

async function requestSingleplayerConfirmation(
    interaction: TicTacToeInteraction,
    player: User,
    botUserId: string
): Promise<boolean> {
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('continue_singleplayer')
            .setLabel('Continue Anyway')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('cancel_game')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
    );

    await safeReply(interaction, {
        embeds: [createBotNotInServerEmbed(botUserId)],
        components: [buttons],
        ephemeral: true
    });

    const replyMessage = await interaction.fetchReply();
    let settled = false;

    return new Promise((resolve) => {
        const collector = replyMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30_000,
            filter: (button) => button.user.id === player.id
        });

        const settle = async (value: boolean, content: string) => {
            if (settled) {
                return;
            }

            settled = true;
            collector.stop();
            await safeEditReply(interaction, { content, embeds: [], components: [] });
            resolve(value);
        };

        collector.on('collect', async (button) => {
            if (button.customId === 'continue_singleplayer') {
                await safeDeferUpdate(button);
                await settle(true, 'Starting singleplayer game (ephemeral mode)...');
                return;
            }

            if (button.customId === 'cancel_game') {
                await safeDeferUpdate(button);
                await settle(false, 'Game cancelled.');
            }
        });

        collector.on('end', async (_collected, reason) => {
            if (settled) {
                return;
            }

            await safeEditReply(interaction, {
                content: 'Game setup timed out.',
                embeds: [],
                components: []
            });
            resolve(false);
        });
    });
}

async function handleSingleplayerReplay(
    interaction: TicTacToeInteraction,
    player: User,
    bot: User,
    board: Board
): Promise<void> {
    const message = await interaction.fetchReply();
    const replayCollector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 15_000
    });

    replayCollector.on('collect', async (button) => {
        if (button.customId !== 'replay') {
            return;
        }

        if (button.user.id !== player.id) {
            return safeReply(button, {
                content: 'Only you can replay this game.',
                flags: MessageFlags.Ephemeral
            });
        }

        await safeDeferUpdate(button);
        await safeEditReply(interaction, { content: 'Starting a new game...', embeds: [], components: [] });
        replayCollector.stop('accepted');
        await startSinglePlayerGame(button, player, bot);
    });

    replayCollector.on('end', async (_, reason) => {
        if (reason === 'accepted') {
            return;
        }

        await safeEditReply(interaction, {
            embeds: [createGameEmbed(board, 'Game over!')],
            components: []
        });
    });
}

async function incrementMultiplayerStats(
    gameStatsModel: ReturnType<typeof getGameStatsModel>,
    userId: string,
    increments: Record<string, number>
): Promise<void> {
    await gameStatsModel.updateOne({ userId }, { $inc: increments });
}

async function handleMultiplayerReplay(
    interaction: TicTacToeInteraction,
    message: Message<boolean>,
    player1: User,
    player2: User
): Promise<void> {
    const replayCollector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 15_000
    });
    let replayInitiator: string | null = null;

    replayCollector.on('collect', async (button) => {
        if (button.customId !== 'replay') {
            return;
        }

        const isPlayer = [player1.id, player2.id].includes(button.user.id);
        if (!isPlayer) {
            return safeReply(button, {
                content: 'Only the players can replay this game.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (!replayInitiator) {
            replayInitiator = button.user.id;
            await safeDeferUpdate(button);
            await safeEditReply(interaction, {
                embeds: [createGameEmbed(createBoard(), `${button.user.username} wants a rematch! Waiting for the other player to accept...`)],
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId('replay')
                            .setLabel('Accept Replay')
                            .setEmoji('🔄')
                            .setStyle(ButtonStyle.Success)
                    )
                ]
            });
            return;
        }

        if (button.user.id === replayInitiator) {
            return safeReply(button, {
                content: 'Waiting for the other player to accept.',
                flags: MessageFlags.Ephemeral
            });
        }

        await safeDeferUpdate(button);
        await safeEditReply(interaction, { content: 'Starting a new game...', components: [] });
        replayCollector.stop('accepted');
        await startMultiplayerGame(button, player1, player2);
    });

    replayCollector.on('end', async (_, reason) => {
        if (reason === 'accepted') {
            return;
        }

        await safeEditReply(interaction, {
            embeds: [createGameEmbed(createBoard(), 'Game over!')],
            components: []
        });
    });
}

export async function startSinglePlayerGame(
    interaction: TicTacToeInteraction,
    player: User,
    bot: User
): Promise<void> {
    try {
        const gameStatsModel = getGameStatsModel('userdb');
        const botUserId = interaction.client.user?.id ?? bot.id;

        if (interaction.guild && !isBotProperlyInGuild(interaction)) {
            const shouldContinue = await requestSingleplayerConfirmation(interaction, player, botUserId);
            if (!shouldContinue) {
                return;
            }
        }

        const board = createBoard();
        const embed = createGameEmbed(board, `It's ${player.username}'s turn!`);
        const components = createGameButtons(board, true);

        await safeReply(interaction, { embeds: [embed], components });
        const message = await interaction.fetchReply();

        let timeout: NodeJS.Timeout | undefined;
        const resetTimer = (): void => {
            if (timeout) {
                clearTimeout(timeout);
            }

            timeout = setTimeout(() => collector.stop('timeout'), SINGLEPLAYER_TIMEOUT_MS);
        };

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button
        });

        resetTimer();

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.customId === 'withdraw') {
                if (buttonInteraction.user.id !== player.id) {
                    return safeReply(buttonInteraction, {
                        content: 'Only the player can withdraw this game.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                await safeDeferUpdate(buttonInteraction);
                collector.stop('withdraw');
                return;
            }

            if (buttonInteraction.user.id !== player.id) {
                return safeReply(buttonInteraction, {
                    content: 'This is not your game!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const coordinates = parseBoardCoordinate(buttonInteraction.customId);
            if (!coordinates) {
                return;
            }

            const [row, col] = coordinates;
            if (board[row][col] !== EMPTY_CELL) {
                return safeReply(buttonInteraction, {
                    content: 'This spot is already taken!',
                    flags: MessageFlags.Ephemeral
                });
            }

            board[row][col] = PLAYER_MARK;
            await safeDeferUpdate(buttonInteraction);

            const winner = checkWinner(board);
            if (winner === PLAYER_MARK) {
                collector.stop('win');
                return;
            }

            if (isBoardFull(board)) {
                collector.stop('draw');
                return;
            }

            botMove(board);
            const botWinner = checkWinner(board);
            if (botWinner === BOT_MARK) {
                collector.stop('loss');
                return;
            }

            if (isBoardFull(board)) {
                collector.stop('draw');
                return;
            }

            resetTimer();
            await safeEditReply(interaction, {
                embeds: [createGameEmbed(board, `It's ${player.username}'s turn!`)],
                components: createGameButtons(board, true)
            });
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'cancel') {
                return;
            }

            const result: SingleplayerOutcome = reason as SingleplayerOutcome;
            if (result !== 'timeout') {
                await incrementSingleplayerStats(gameStatsModel, player.id, result);
            }

            await safeEditReply(interaction, {
                embeds: [createGameEmbed(board, getSingleplayerResultText(result, player))],
                components: [getReplayRow()]
            });

            await handleSingleplayerReplay(interaction, player, bot, board);
        });
    } catch (error) {
        console.error('Error in startSinglePlayerGame:', error);
        await safeReply(interaction, {
            content: 'An error occurred while starting the game. Please try again later.',
            ephemeral: true
        });
    }
}

export async function startMultiplayerGame(
    interaction: TicTacToeInteraction,
    player1: User,
    player2: User
): Promise<void> {
    try {
        if (interaction.guild && !isBotProperlyInGuild(interaction)) {
            const botUserId = interaction.client.user?.id ?? '0';
            return safeReply(interaction, {
                embeds: [
                    createBotNotInServerEmbed(botUserId).setDescription(
                        createBotNotInServerEmbed(botUserId).data.description +
                        '\n\n**Multiplayer games require the bot to be properly invited to the server.**'
                    )
                ],
                ephemeral: true
            });
        }

        const gameStatsModel = getGameStatsModel('userdb');
        const player1Id = player1.id;
        const player2Id = player2.id;

        await gameStatsModel.updateOne({ userId: player1Id }, { $setOnInsert: { 'gameStats.multiplayer.tictactoe': DEFAULT_MULTIPLAYER_STATS } }, { upsert: true });
        await gameStatsModel.updateOne({ userId: player2Id }, { $setOnInsert: { 'gameStats.multiplayer.tictactoe': DEFAULT_MULTIPLAYER_STATS } }, { upsert: true });

        const board = createBoard();
        let currentPlayer = Math.random() < 0.5 ? player1 : player2;
        let movesMade = 0;

        const embed = createGameEmbed(board, `It's ${currentPlayer.username}'s turn!`);
        const components = [...createGameButtons(board), getGameControlRow({ multiplayer: true })];

        await safeReply(interaction, {
            content: `<@${player2.id}>`,
            embeds: [embed],
            components
        });

        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: MULTIPLAYER_TIMEOUT_MS
        });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.customId === 'withdraw') {
                if (![player1Id, player2Id].includes(buttonInteraction.user.id)) {
                    return safeReply(buttonInteraction, {
                        content: 'Only the players can resign this game.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                await safeDeferUpdate(buttonInteraction);
                const resignedPlayer = buttonInteraction.user.id === player1Id ? player1 : player2;
                const winnerPlayer = buttonInteraction.user.id === player1Id ? player2 : player1;

                await incrementMultiplayerStats(gameStatsModel, buttonInteraction.user.id, {
                    'gameStats.multiplayer.tictactoe.losses': 1,
                    'gameStats.multiplayer.tictactoe.gamesPlayed': 1
                });
                await incrementMultiplayerStats(gameStatsModel, winnerPlayer.id, {
                    'gameStats.multiplayer.tictactoe.wins': 1,
                    'gameStats.multiplayer.tictactoe.gamesPlayed': 1
                });

                await safeEditReply(interaction, {
                    embeds: [createGameEmbed(board, `${resignedPlayer.username} resigned. ${winnerPlayer.username} wins!`)],
                    components: [getReplayRow()]
                });

                collector.stop('resign');
                return;
            }

            if (buttonInteraction.customId === 'offer_draw') {
                if (![player1Id, player2Id].includes(buttonInteraction.user.id)) {
                    return safeReply(buttonInteraction, {
                        content: 'Only the players can offer a draw.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                await safeDeferUpdate(buttonInteraction);
                const offeringPlayer = buttonInteraction.user.id === player1Id ? player1 : player2;
                const otherPlayer = buttonInteraction.user.id === player1Id ? player2 : player1;

                const drawButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`accept_draw_${otherPlayer.id}`)
                        .setLabel('Accept Draw')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`decline_draw_${otherPlayer.id}`)
                        .setLabel('Decline Draw')
                        .setStyle(ButtonStyle.Danger)
                );

                await safeEditReply(interaction, {
                    embeds: [createGameEmbed(board, `${offeringPlayer.username} offers a draw. ${otherPlayer.username}, do you accept?`)],
                    components: [...createGameButtons(board), drawButtons]
                });
                return;
            }

            if (buttonInteraction.customId.startsWith('accept_draw_') || buttonInteraction.customId.startsWith('decline_draw_')) {
                const expectedUserId = buttonInteraction.customId.split('_')[2];
                if (buttonInteraction.user.id !== expectedUserId) {
                    return safeReply(buttonInteraction, {
                        content: 'Only the player being asked can respond to the draw offer.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                await safeDeferUpdate(buttonInteraction);

                if (buttonInteraction.customId.startsWith('accept_draw_')) {
                    await incrementMultiplayerStats(gameStatsModel, player1Id, {
                        'gameStats.multiplayer.tictactoe.draws': 1,
                        'gameStats.multiplayer.tictactoe.gamesPlayed': 1
                    });
                    await incrementMultiplayerStats(gameStatsModel, player2Id, {
                        'gameStats.multiplayer.tictactoe.draws': 1,
                        'gameStats.multiplayer.tictactoe.gamesPlayed': 1
                    });

                    await safeEditReply(interaction, {
                        embeds: [createGameEmbed(board, "Draw accepted! It's a draw!")],
                        components: [getReplayRow()]
                    });
                    collector.stop('draw');
                    return;
                }

                await safeEditReply(interaction, {
                    embeds: [createGameEmbed(board, `It's ${currentPlayer.username}'s turn!`)],
                    components: [...createGameButtons(board), getGameControlRow({ multiplayer: true })]
                });
                return;
            }

            if (![player1Id, player2Id].includes(buttonInteraction.user.id)) {
                return safeReply(buttonInteraction, {
                    content: 'This is not your game! Start a new game with `/game tictactoe`.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (buttonInteraction.user.id !== currentPlayer.id) {
                return safeReply(buttonInteraction, {
                    content: "It's not your turn! Please wait for your turn.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const coordinates = parseBoardCoordinate(buttonInteraction.customId);
            if (!coordinates) {
                return;
            }

            const [row, col] = coordinates;
            if (board[row][col] !== EMPTY_CELL) {
                return safeReply(buttonInteraction, {
                    content: 'This spot is already taken!',
                    flags: MessageFlags.Ephemeral
                });
            }

            await safeDeferUpdate(buttonInteraction);
            board[row][col] = buttonInteraction.user.id === player1Id ? PLAYER_MARK : BOT_MARK;
            movesMade += 1;

            const winner = checkWinner(board);
            if (winner) {
                const winnerPlayer = winner === PLAYER_MARK ? player1 : player2;
                const loserPlayer = winner === PLAYER_MARK ? player2 : player1;

                await incrementMultiplayerStats(gameStatsModel, winnerPlayer.id, {
                    'gameStats.multiplayer.tictactoe.wins': 1,
                    'gameStats.multiplayer.tictactoe.gamesPlayed': 1
                });
                await incrementMultiplayerStats(gameStatsModel, loserPlayer.id, {
                    'gameStats.multiplayer.tictactoe.losses': 1,
                    'gameStats.multiplayer.tictactoe.gamesPlayed': 1
                });

                await safeEditReply(interaction, {
                    embeds: [createGameEmbed(board, `${winnerPlayer.username} wins!`)],
                    components: [getReplayRow()]
                });
                collector.stop('win');
                return;
            }

            if (isBoardFull(board)) {
                await incrementMultiplayerStats(gameStatsModel, player1Id, {
                    'gameStats.multiplayer.tictactoe.draws': 1,
                    'gameStats.multiplayer.tictactoe.gamesPlayed': 1
                });
                await incrementMultiplayerStats(gameStatsModel, player2Id, {
                    'gameStats.multiplayer.tictactoe.draws': 1,
                    'gameStats.multiplayer.tictactoe.gamesPlayed': 1
                });

                await safeEditReply(interaction, {
                    embeds: [createGameEmbed(board, "It's a draw!")],
                    components: [getReplayRow()]
                });
                collector.stop('draw');
                return;
            }

            currentPlayer = currentPlayer.id === player1Id ? player2 : player1;
            await safeEditReply(interaction, {
                embeds: [createGameEmbed(board, `It's ${currentPlayer.username}'s turn!`)],
                components: [...createGameButtons(board), getGameControlRow({ multiplayer: true })]
            });
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'win' || reason === 'draw' || reason === 'resign') {
                const replyMessage = await interaction.fetchReply();
                await handleMultiplayerReplay(interaction, replyMessage, player1, player2);
                return;
            }

            if (reason === 'time' || reason === 'idle' || reason === 'timeout') {
                if (movesMade === 0) {
                    await safeEditReply(interaction, {
                        content: `<@${player2.id}> did not join the game, auto aborting.`,
                        embeds: [],
                        components: []
                    });
                    return;
                }

                await safeEditReply(interaction, {
                    embeds: [createGameEmbed(board, 'Game over!')],
                    components: []
                });
            }
        });
    } catch (error) {
        console.error('Error in startMultiplayerGame:', error);
        await safeReply(interaction, {
            content: 'An error occurred while starting the game. Please try again later.',
            ephemeral: true
        });
    }
}
