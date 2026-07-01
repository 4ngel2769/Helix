import type { User } from 'discord.js';
import { getGameStatsModel } from '../../../models/GameStats';
import type { SingleplayerOutcome } from './types';

export function getSingleplayerResultText(result: SingleplayerOutcome, player: User): string {
  switch (result) {
    case 'withdraw': return 'You withdrew from the game. The bot wins!';
    case 'win': return `${player.username} wins!`;
    case 'loss': return 'The bot wins!';
    case 'draw': return "It's a draw!";
    case 'timeout': return 'The game ended in a draw due to inactivity.';
  }
}

function getSingleplayerIncrements(result: SingleplayerOutcome): Record<string, number> {
  switch (result) {
    case 'win': return { 'gameStats.singleplayer.tictactoe.wins': 1, 'gameStats.singleplayer.tictactoe.gamesPlayed': 1 };
    case 'loss': return { 'gameStats.singleplayer.tictactoe.losses': 1, 'gameStats.singleplayer.tictactoe.gamesPlayed': 1 };
    case 'draw': return { 'gameStats.singleplayer.tictactoe.draws': 1, 'gameStats.singleplayer.tictactoe.gamesPlayed': 1 };
    case 'withdraw': return { 'gameStats.singleplayer.tictactoe.losses': 1, 'gameStats.singleplayer.tictactoe.gamesPlayed': 1 };
    default: return {};
  }
}

export async function incrementSingleplayerStats(
  userId: string,
  result: SingleplayerOutcome
): Promise<void> {
  const increments = getSingleplayerIncrements(result);
  if (!Object.keys(increments).length) return;
  const gameStatsModel = getGameStatsModel('userdb');
  await gameStatsModel.updateOne({ userId }, { $inc: increments }, { upsert: true });
}

export async function incrementMultiplayerStats(
  userId: string,
  increments: Record<string, number>
): Promise<void> {
  const gameStatsModel = getGameStatsModel('userdb');
  await gameStatsModel.updateOne({ userId }, { $inc: increments });
}
