import {
    ActionRowBuilder, ButtonBuilder, ButtonInteraction, ComponentType, EmbedBuilder, User
} from 'discord.js';
import { getGameStatsModel } from '../../../models/GameStats';
import { getGameControlRow, getReplayRow } from '../../../components/GameControls';
import { ModuleCommand } from '@kbotdev/plugin-modules';

export async function startSinglePlayerGame(
    interaction: ModuleCommand.ChatInputCommandInteraction | ButtonInteraction,
    player: User,
    bot: User
) {
    // ...move the full startSinglePlayerGame logic here (no class/this)...
}

export async function startMultiplayerGame(
    interaction: ModuleCommand.ChatInputCommandInteraction,
    player1: User,
    player2: User
) {
    // ...move the full startMultiplayerGame logic here (no class/this)...
}