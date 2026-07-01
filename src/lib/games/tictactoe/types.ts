import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { ButtonInteraction } from 'discord.js';

export type TicTacToeInteraction = ModuleCommand.ChatInputCommandInteraction | ButtonInteraction;

export type SingleplayerOutcome = 'win' | 'loss' | 'draw' | 'withdraw' | 'timeout';

export type MultiplayerMoveResult = 'win' | 'draw' | 'resign' | 'timeout';

export const SINGLEPLAYER_TIMEOUT_MS = 300_000;
export const MULTIPLAYER_TIMEOUT_MS = 60_000;
export const DEFAULT_MULTIPLAYER_STATS = { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 };
