import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function getGameControlRow({ multiplayer = false }: { multiplayer?: boolean } = {}) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('resign')
            .setLabel('Resign')
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
            .setStyle(ButtonStyle.Success)
    );
}