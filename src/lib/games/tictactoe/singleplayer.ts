import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  User
} from 'discord.js';
import { MessageFlags } from 'discord-api-types/v10';
import { getGameControlRow, getReplayRow } from '../../../components/GameControls';
import { safeDeferUpdate, safeEditReply, safeReply } from '../../utils/interactionHelpers';
import { container } from '@sapphire/framework';
import type { TicTacToeInteraction, SingleplayerOutcome } from './types';
import { SINGLEPLAYER_TIMEOUT_MS } from './types';
import { createBoard, checkWinner, isBoardFull, botMove, PLAYER_MARK, BOT_MARK, EMPTY_CELL } from './board';
import { createGameEmbed, createGameButtons, parseBoardCoordinate, isBotProperlyInGuild, createBotNotInServerEmbed } from './ui';
import { getSingleplayerResultText, incrementSingleplayerStats } from './stats';

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
    flags: MessageFlags.Ephemeral
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
      if (settled) return;
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

    collector.on('end', async () => {
      if (settled) return;
      await safeEditReply(interaction, { content: 'Game setup timed out.', embeds: [], components: [] });
      resolve(false);
    });
  });
}

async function handleSingleplayerReplay(
  interaction: TicTacToeInteraction,
  player: User,
  bot: User,
  board: string[][]
): Promise<void> {
  const message = await interaction.fetchReply();
  const replayCollector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 15_000
  });

  replayCollector.on('collect', async (button) => {
    if (button.customId !== 'replay') return;
    if (button.user.id !== player.id) {
      return safeReply(button, { content: 'Only you can replay this game.', flags: MessageFlags.Ephemeral });
    }
    await safeDeferUpdate(button);
    await safeEditReply(interaction, { content: 'Starting a new game...', embeds: [], components: [] });
    replayCollector.stop('accepted');
    await startSinglePlayerGame(button, player, bot);
  });

  replayCollector.on('end', async (_, reason) => {
    if (reason === 'accepted') return;
    await safeEditReply(interaction, { embeds: [createGameEmbed(board, 'Game over!')], components: [] });
  });
}

export async function startSinglePlayerGame(
  interaction: TicTacToeInteraction,
  player: User,
  bot: User
): Promise<void> {
  try {
    const botUserId = interaction.client.user?.id ?? bot.id;

    if (interaction.guild && !isBotProperlyInGuild(interaction)) {
      const shouldContinue = await requestSingleplayerConfirmation(interaction, player, botUserId);
      if (!shouldContinue) return;
    }

    const board = createBoard();
    const embed = createGameEmbed(board, `It's ${player.username}'s turn!`);
    const components = createGameButtons(board, true);

    await safeReply(interaction, { embeds: [embed], components });
    const message = await interaction.fetchReply();

    let timeout: NodeJS.Timeout | undefined;
    const resetTimer = (): void => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => collector.stop('timeout'), SINGLEPLAYER_TIMEOUT_MS);
    };

    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button });
    resetTimer();

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.customId === 'withdraw') {
        if (buttonInteraction.user.id !== player.id) {
          return safeReply(buttonInteraction, { content: 'Only the player can withdraw this game.', flags: MessageFlags.Ephemeral });
        }
        await safeDeferUpdate(buttonInteraction);
        collector.stop('withdraw');
        return;
      }

      if (buttonInteraction.user.id !== player.id) {
        return safeReply(buttonInteraction, { content: 'This is not your game!', flags: MessageFlags.Ephemeral });
      }

      const coordinates = parseBoardCoordinate(buttonInteraction.customId);
      if (!coordinates) return;

      const [row, col] = coordinates;
      if (board[row][col] !== EMPTY_CELL) {
        return safeReply(buttonInteraction, { content: 'This spot is already taken!', flags: MessageFlags.Ephemeral });
      }

      board[row][col] = PLAYER_MARK;
      await safeDeferUpdate(buttonInteraction);

      if (checkWinner(board) === PLAYER_MARK) { collector.stop('win'); return; }
      if (isBoardFull(board)) { collector.stop('draw'); return; }

      botMove(board);
      if (checkWinner(board) === BOT_MARK) { collector.stop('loss'); return; }
      if (isBoardFull(board)) { collector.stop('draw'); return; }

      resetTimer();
      await safeEditReply(interaction, {
        embeds: [createGameEmbed(board, `It's ${player.username}'s turn!`)],
        components: createGameButtons(board, true)
      });
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'cancel') return;
      const result = reason as SingleplayerOutcome;
      if (result !== 'timeout') await incrementSingleplayerStats(player.id, result);

      await safeEditReply(interaction, {
        embeds: [createGameEmbed(board, getSingleplayerResultText(result, player))],
        components: [getReplayRow()]
      });

      await handleSingleplayerReplay(interaction, player, bot, board);
    });
  } catch (error) {
    container.logger.error('Error in startSinglePlayerGame:', error);
    await safeReply(interaction, { content: 'An error occurred while starting the game. Please try again later.', flags: MessageFlags.Ephemeral });
  }
}
