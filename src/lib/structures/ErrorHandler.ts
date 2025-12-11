import {
    EmbedBuilder,
    ColorResolvable,
    TextChannel,
    PermissionsBitField,
    MessageFlags,
    ChatInputCommandInteraction,
    ButtonInteraction,
    StringSelectMenuInteraction,
    ModalSubmitInteraction
} from 'discord.js';
import type { ApiResponse } from '@sapphire/plugin-api';
import config from '../../config';

type RepliableInteraction = ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction;

export class ErrorHandler {
    // Permission error messages
    static async sendPermissionError(interaction: RepliableInteraction, permission: keyof typeof PermissionsBitField.Flags) {
        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.err as ColorResolvable)
            .setTitle('❌ Permission Error')
            .setDescription(`I don't have the \`${permission}\` permission in ${interaction.channel}.`)
            .setFooter({ text: 'Please contact a server administrator to fix this.' });

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // Moderator only error
    static async sendModeratorError(interaction: RepliableInteraction) {
        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.err as ColorResolvable)
            .setTitle('❌ Access Denied')
            .setDescription('This command can only be used by moderators.')
            .setFooter({ text: 'You do not have the required permissions.' });

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // Channel type error
    static async sendChannelTypeError(interaction: RepliableInteraction, requiredType: string) {
        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.err as ColorResolvable)
            .setTitle('❌ Invalid Channel')
            .setDescription(`This command can only be used in a ${requiredType} channel.`)
            .setFooter({ text: 'Please try again in the correct channel type.' });

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // Module disabled error
    static async sendModuleDisabledError(interaction: RepliableInteraction, moduleName: string) {
        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.err as ColorResolvable)
            .setTitle('❌ Module Disabled')
            .setDescription(`The ${moduleName} module is currently disabled in this server.`)
            .setFooter({ text: 'Contact a server administrator to enable it.' });

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // Generic command error
    static async sendCommandError(interaction: RepliableInteraction, error: string) {
        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.err as ColorResolvable)
            .setTitle('❌ Error')
            .setDescription(error)
            .setFooter({ text: 'If this persists, please contact a server administrator.' });

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // Missing setup error
    static async sendMissingSetupError(interaction: RepliableInteraction, missingItems: string[]) {
        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.err as ColorResolvable)
            .setTitle('⚠️ Setup Required')
            .setDescription('The following items need to be set up:')
            .addFields(
                missingItems.map(item => ({
                    name: '❌ Missing',
                    value: item
                }))
            )
            .setFooter({ text: 'Please complete the setup to use this feature.' });

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // Check permissions
    static async checkPermissions(channel: TextChannel, permissions: (keyof typeof PermissionsBitField.Flags)[]) {
        try {
            const botMember = channel.guild.members.me;
            if (!botMember) return false;

            return permissions.every(permission => 
                botMember.permissionsIn(channel).has(PermissionsBitField.Flags[permission])
            );
        } catch (error) {
            console.error('Permission check failed:', error);
            return false;
        }
    }

    // Emoji error messages
    static async sendEmojiError(interaction: RepliableInteraction, errorType: 'size' | 'limit' | 'url' | 'name') {
        try {
            const errorMessages = {
                size: 'The image file is too large. Maximum size is 256KB.',
                limit: 'Maximum number of emojis reached for this server.',
                url: 'Invalid image URL. Must be a direct link to a PNG, JPG, or GIF file.',
                name: 'Emoji name must be between 2 and 32 characters long.'
            };

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Emoji Error')
                .setDescription(errorMessages[errorType])
                .setFooter({ text: 'Please try again with valid parameters.' });

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error('Failed to send emoji error:', error);
            return interaction.reply({ 
                content: 'An error occurred while processing your request.', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
    
    // Add a general error logger
    static logError(context: string, error: unknown): void {
        console.error(`[ERROR] ${context}:`, error);
    }
    
    // Add a method to handle API errors
    static async handleApiError(response: ApiResponse, error: unknown, statusCode = 500): Promise<ApiResponse> {
        this.logError('API Error', error);
        return response.status(statusCode).json({
            error: 'An error occurred while processing your request',
            timestamp: new Date().toISOString()
        });
    }
}