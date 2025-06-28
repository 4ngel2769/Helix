import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function getGameControlRow({ multiplayer = false }: { multiplayer?: boolean } = {}) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('withdraw')
            .setLabel('Resign')
            .setEmoji('🤝')
            .setStyle(ButtonStyle.Danger)
    );
    if (multiplayer) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('offer_draw')
                .setLabel('Offer Draw')
                .setStyle(ButtonStyle.Secondary)
        );
    }
    return row;
}

export function getReplayRow() {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('replay')
            .setLabel('Replay')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Success)
    );
}