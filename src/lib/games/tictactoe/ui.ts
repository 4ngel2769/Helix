import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';
import type { Board } from './board';
import { EMPTY_CELL } from './board';
import type { TicTacToeInteraction } from './types';

export function createBotNotInServerEmbed(botUserId: string): EmbedBuilder {
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

export function isBotProperlyInGuild(interaction: TicTacToeInteraction): boolean {
  if (!interaction.guild) return true;
  const botMember = interaction.guild.members.cache.get(interaction.client.user!.id);
  return !!botMember;
}

export function createGameEmbed(board: Board, status: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Tic Tac Toe')
    .setDescription(board.map((row) => row.join(' ')).join('\n'))
    .setFooter({ text: status });
}

export function createGameButtons(board: Board, includeWithdraw = false): ActionRowBuilder<ButtonBuilder>[] {
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

  if (!includeWithdraw) return rows;

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

export function parseBoardCoordinate(customId: string): [number, number] | null {
  const [row, col] = customId.split('-').map(Number);
  if (Number.isNaN(row) || Number.isNaN(col) || row < 0 || row > 2 || col < 0 || col > 2) {
    return null;
  }
  return [row, col];
}
