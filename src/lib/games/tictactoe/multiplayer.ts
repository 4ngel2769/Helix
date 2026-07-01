import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  User
} from 'discord.js';
import { MessageFlags } from 'discord-api-types/v10';
import { getGameControlRow, getReplayRow } from '../../../components/GameControls';
import { safeDeferUpdate, safeEditReply, safeReply } from '../../utils/interactionHelpers';
import { container } from '@sapphire/framework';
import type { TicTacToeInteraction } from './types';
import { MULTIPLAYER_TIMEOUT_MS, DEFAULT_MULTIPLAYER_STATS } from './types';
import { createBoard, checkWinner, isBoardFull, PLAYER_MARK, BOT_MARK } from './board';
import { createGameEmbed, createGameButtons, parseBoardCoordinate, isBotProperlyInGuild, createBotNotInServerEmbed } from './ui';
import { incrementMultiplayerStats } from './stats';

async function handleMultiplayerReplay(
  interaction: TicTacToeInteraction,
  message: import('discord.js').Message<boolean>,
  player1: User,
  player2: User
): Promise<void> {
  const replayCollector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 15_000
  });
  let replayInitiator: string | null = null;

  replayCollector.on('collect', async (button) => {
    if (button.customId !== 'replay') return;
    if (![player1.id, player2.id].includes(button.user.id)) {
      return safeReply(button, { content: 'Only the players can replay this game.', flags: MessageFlags.Ephemeral });
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
      return safeReply(button, { content: 'Waiting for the other player to accept.', flags: MessageFlags.Ephemeral });
    }

    await safeDeferUpdate(button);
    await safeEditReply(interaction, { content: 'Starting a new game...', components: [] });
    replayCollector.stop('accepted');
    await startMultiplayerGame(button, player1, player2);
  });

  replayCollector.on('end', async (_, reason) => {
    if (reason === 'accepted') return;
    await safeEditReply(interaction, { embeds: [createGameEmbed(createBoard(), 'Game over!')], components: [] });
  });
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
        embeds: [createBotNotInServerEmbed(botUserId).setDescription(
          createBotNotInServerEmbed(botUserId).data.description! +
          '\n\n**Multiplayer games require the bot to be properly invited to the server.**'
        )],
        ephemeral: true
      });
    }

    const player1Id = player1.id;
    const player2Id = player2.id;

    await incrementMultiplayerStats(player1Id, { $setOnInsert: { 'gameStats.multiplayer.tictactoe': DEFAULT_MULTIPLAYER_STATS } } as any);
    await incrementMultiplayerStats(player2Id, { $setOnInsert: { 'gameStats.multiplayer.tictactoe': DEFAULT_MULTIPLAYER_STATS } } as any);

    const board = createBoard();
    let currentPlayer = Math.random() < 0.5 ? player1 : player2;
    let movesMade = 0;

    const embed = createGameEmbed(board, `It's ${currentPlayer.username}'s turn!`);
    const components = [...createGameButtons(board), getGameControlRow({ multiplayer: true })];

    await safeReply(interaction, { content: `<@${player2.id}>`, embeds: [embed], components });
    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: MULTIPLAYER_TIMEOUT_MS
    });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.customId === 'withdraw') {
        if (![player1Id, player2Id].includes(buttonInteraction.user.id)) {
          return safeReply(buttonInteraction, { content: 'Only the players can resign this game.', flags: MessageFlags.Ephemeral });
        }

        await safeDeferUpdate(buttonInteraction);
        const resignedPlayer = buttonInteraction.user.id === player1Id ? player1 : player2;
        const winnerPlayer = buttonInteraction.user.id === player1Id ? player2 : player1;

        await incrementMultiplayerStats(buttonInteraction.user.id, { 'gameStats.multiplayer.tictactoe.losses': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 });
        await incrementMultiplayerStats(winnerPlayer.id, { 'gameStats.multiplayer.tictactoe.wins': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 });

        await safeEditReply(interaction, {
          embeds: [createGameEmbed(board, `${resignedPlayer.username} resigned. ${winnerPlayer.username} wins!`)],
          components: [getReplayRow()]
        });

        collector.stop('resign');
        return;
      }

      if (buttonInteraction.customId === 'offer_draw') {
        if (![player1Id, player2Id].includes(buttonInteraction.user.id)) {
          return safeReply(buttonInteraction, { content: 'Only the players can offer a draw.', flags: MessageFlags.Ephemeral });
        }

        await safeDeferUpdate(buttonInteraction);
        const offeringPlayer = buttonInteraction.user.id === player1Id ? player1 : player2;
        const otherPlayer = buttonInteraction.user.id === player1Id ? player2 : player1;

        const drawButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`accept_draw_${otherPlayer.id}`).setLabel('Accept Draw').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`decline_draw_${otherPlayer.id}`).setLabel('Decline Draw').setStyle(ButtonStyle.Danger)
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
          return safeReply(buttonInteraction, { content: 'Only the player being asked can respond to the draw offer.', flags: MessageFlags.Ephemeral });
        }

        await safeDeferUpdate(buttonInteraction);

        if (buttonInteraction.customId.startsWith('accept_draw_')) {
          await incrementMultiplayerStats(player1Id, { 'gameStats.multiplayer.tictactoe.draws': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 });
          await incrementMultiplayerStats(player2Id, { 'gameStats.multiplayer.tictactoe.draws': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 });

          await safeEditReply(interaction, { embeds: [createGameEmbed(board, "Draw accepted! It's a draw!")], components: [getReplayRow()] });
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
        return safeReply(buttonInteraction, { content: 'This is not your game! Start a new game with `/game tictactoe`.', flags: MessageFlags.Ephemeral });
      }

      if (buttonInteraction.user.id !== currentPlayer.id) {
        return safeReply(buttonInteraction, { content: "It's not your turn! Please wait for your turn.", flags: MessageFlags.Ephemeral });
      }

      const coordinates = parseBoardCoordinate(buttonInteraction.customId);
      if (!coordinates) return;

      const [row, col] = coordinates;
      if (board[row][col] !== '⬜') {
        return safeReply(buttonInteraction, { content: 'This spot is already taken!', flags: MessageFlags.Ephemeral });
      }

      await safeDeferUpdate(buttonInteraction);
      board[row][col] = buttonInteraction.user.id === player1Id ? PLAYER_MARK : BOT_MARK;
      movesMade += 1;

      const winner = checkWinner(board);
      if (winner) {
        const winnerPlayer = winner === PLAYER_MARK ? player1 : player2;
        const loserPlayer = winner === PLAYER_MARK ? player2 : player1;

        await incrementMultiplayerStats(winnerPlayer.id, { 'gameStats.multiplayer.tictactoe.wins': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 });
        await incrementMultiplayerStats(loserPlayer.id, { 'gameStats.multiplayer.tictactoe.losses': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 });

        await safeEditReply(interaction, { embeds: [createGameEmbed(board, `${winnerPlayer.username} wins!`)], components: [getReplayRow()] });
        collector.stop('win');
        return;
      }

      if (isBoardFull(board)) {
        await incrementMultiplayerStats(player1Id, { 'gameStats.multiplayer.tictactoe.draws': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 });
        await incrementMultiplayerStats(player2Id, { 'gameStats.multiplayer.tictactoe.draws': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 });

        await safeEditReply(interaction, { embeds: [createGameEmbed(board, "It's a draw!")], components: [getReplayRow()] });
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
          await safeEditReply(interaction, { content: `<@${player2.id}> did not join the game, auto aborting.`, embeds: [], components: [] });
          return;
        }
        await safeEditReply(interaction, { embeds: [createGameEmbed(board, 'Game over!')], components: [] });
      }
    });
  } catch (error) {
    container.logger.error('Error in startMultiplayerGame:', error);
    await safeReply(interaction, { content: 'An error occurred while starting the game. Please try again later.', ephemeral: true });
  }
}
