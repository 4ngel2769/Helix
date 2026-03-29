import { container } from '@sapphire/framework';
import {
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    MessageFlags,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from 'discord.js';
import { getModuleConfig } from '../../config/modules';
import { GuildConfigService } from '../services/GuildConfigService';

export function getInteractionErrorCode(error: unknown): number | undefined {
    if (typeof error === 'object' && error !== null && 'code' in error) {
        const code = (error as { code?: unknown }).code;
        return typeof code === 'number' ? code : undefined;
    }

    return undefined;
}

export function createDefaultGuildData(guildId: string): { guildId: string; modules: Record<string, boolean> } {
    return GuildConfigService.createDefaultGuildData(guildId);
}

export function paginateItems<T>(items: T[], pageSize: number): T[][] {
    const pages: T[][] = [];
    for (let i = 0; i < items.length; i += pageSize) {
        pages.push(items.slice(i, i + pageSize));
    }

    return pages;
}

export function createHelpPaginationButtons(currentPage: number, totalPages: number): [ButtonBuilder, ButtonBuilder] {
    const previousButton = new ButtonBuilder()
        .setCustomId('previous')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0);

    const nextButton = new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === totalPages - 1);

    return [previousButton, nextButton];
}

export function createHelpModuleSelect(modules: string[]): StringSelectMenuBuilder {
    return new StringSelectMenuBuilder()
        .setCustomId('module-select')
        .setPlaceholder('Select a module')
        .addOptions(
            modules.map((moduleName) => {
                const moduleConfig = getModuleConfig(moduleName);

                return new StringSelectMenuOptionBuilder()
                    .setLabel(moduleConfig?.name || moduleName)
                    .setDescription(moduleConfig?.description || `View ${moduleName} commands`)
                    .setValue(moduleName.toLowerCase())
                    .setEmoji(
                        typeof moduleConfig?.emoji === 'object'
                            ? (moduleConfig.emoji.id
                                ? `${moduleConfig.emoji.animated ? '<a:' : '<:'}${moduleConfig.emoji.name}:${moduleConfig.emoji.id}>`
                                : moduleConfig.emoji.name || '📦')
                            : moduleConfig?.emoji || '📦'
                    );
            })
        );
}

export async function sendInteractionErrorMessage(interaction: ButtonInteraction, message: string): Promise<void> {
    try {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: message,
                flags: MessageFlags.Ephemeral
            });
        } else if (interaction.deferred) {
            await interaction.editReply({
                content: message
            });
        } else {
            await interaction.followUp({
                content: message,
                flags: MessageFlags.Ephemeral
            });
        }
    } catch (error) {
        console.error('Failed to send error message:', error);
        container.logger.debug('Unable to send error message to user, interaction may have expired');
    }
}
