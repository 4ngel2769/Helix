import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { VerificationModule } from '../../modules/Verification';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    TextChannel,
    ColorResolvable
} from 'discord.js';
import { Guild } from '../../models/Guild';
import { ErrorHandler } from '../../lib/structures/ErrorHandler';
import config from '../../config';

@ApplyOptions<Command.Options>({
    name: 'verification',
    description: 'Configure verification settings',
    preconditions: ['GuildOnly', 'ModeratorOnly']
})
export class VerificationCommand extends ModuleCommand<VerificationModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Verification',
            description: 'Configure verification settings',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('verification')
                .setDescription('Configure verification settings')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('channel')
                        .setDescription('Set the verification channel')
                        .addChannelOption((option) =>
                            option
                                .setName('channel')
                                .setDescription('The channel to use for verification')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('message')
                        .setDescription('Set verification messages')
                        .addStringOption((option) =>
                            option
                                .setName('type')
                                .setDescription('Which message to set')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Verification Message', value: 'enabled' },
                                    { name: 'Disabled Message', value: 'disabled' }
                                )
                        )
                        .addStringOption((option) =>
                            option
                                .setName('message')
                                .setDescription('The message to display')
                                .setRequired(true)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('title')
                        .setDescription('Set the verification embed title')
                        .addStringOption((option) =>
                            option
                                .setName('title')
                                .setDescription('The title to display in the verification embed')
                                .setRequired(true)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('footer')
                        .setDescription('Set the verification embed footer')
                        .addStringOption((option) =>
                            option
                                .setName('footer')
                                .setDescription('The footer text to display in the verification embed')
                                .setRequired(false)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('thumbnail')
                        .setDescription('Set the verification embed thumbnail')
                        .addStringOption((option) =>
                            option
                                .setName('url')
                                .setDescription('The URL of the image to use as thumbnail')
                                .setRequired(false)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('role')
                        .setDescription('Set the verification role')
                        .addRoleOption((option) =>
                            option
                                .setName('role')
                                .setDescription('The role to give upon verification')
                                .setRequired(true)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('status')
                        .setDescription('Check current verification settings')
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('toggle')
                        .setDescription('Enable or disable verification')
                        .addBooleanOption((option) =>
                            option
                                .setName('enabled')
                                .setDescription('Enable or disable verification')
                                .setRequired(true)
                        )
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        // Check if user is a moderator
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return ErrorHandler.sendModeratorError(interaction);
        }

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId!;
        let guildData = await Guild.findOne({ guildId });

        if (!guildData) {
            guildData = new Guild({ guildId });
        }

        switch (subcommand) {
            case 'channel': {
                const channel = interaction.options.getChannel('channel', true) as TextChannel;
                
                // Check bot permissions in the target channel
                const hasPermissions = await ErrorHandler.checkPermissions(channel, [
                    'SendMessages',
                    'ViewChannel',
                    'EmbedLinks'
                ]);

                if (!hasPermissions) {
                    return ErrorHandler.sendPermissionError(interaction, 'SendMessages');
                }

                guildData.verificationChannelId = channel.id;
                await guildData.save();

                // Check if all requirements are met
                const missingSetup = [];
                if (!guildData.verificationRoleId) missingSetup.push('Verification Role');
                if (!guildData.verificationMessage) missingSetup.push('Verification Message');

                if (missingSetup.length > 0) {
                    return ErrorHandler.sendMissingSetupError(interaction, missingSetup);
                }

                await this.checkAndSendVerificationMessage(guildData);
                return interaction.reply({
                    content: `✅ Verification channel set to ${channel}`,
                    flags: MessageFlags.Ephemeral
                });
            }

            case 'role': {
                const role = interaction.options.getRole('role', true);
                
                // Check if bot can manage the role
                const botMember = interaction.guild?.members.me;
                if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    return ErrorHandler.sendPermissionError(interaction, 'ManageRoles');
                }

                // Check if role is manageable by bot
                if (role.position >= botMember.roles.highest.position) {
                    return ErrorHandler.sendCommandError(interaction, 'I cannot manage this role. Make sure my highest role is above the verification role.');
                }

                guildData.verificationRoleId = role.id;
                await guildData.save();

                // Check if channel is set
                if (!guildData.verificationChannelId) {
                    return ErrorHandler.sendMissingSetupError(interaction, ['Verification Channel']);
                }

                await this.checkAndSendVerificationMessage(guildData);
                return interaction.reply({
                    content: `✅ Verification role set to ${role}`,
                    flags: MessageFlags.Ephemeral
                });
            }

            case 'toggle': {
                const enabled = interaction.options.getBoolean('enabled', true);
                
                guildData.isVerificationModule = enabled;
                await guildData.save();

                // Update the verification message state
                await this.updateVerificationMessageState(guildData, enabled);

                return interaction.reply({
                    content: `✅ Verification ${enabled ? 'enabled' : 'disabled'}`,
                    flags: MessageFlags.Ephemeral
                });
            }

            case 'message': {
                const type = interaction.options.getString('type', true);
                const message = interaction.options.getString('message', true);

                if (type === 'enabled') {
                    guildData.verificationMessage = message;
                } else if (type === 'disabled') {
                    guildData.verificationDisabledMessage = message;
                }

                guildData.verificationLastModifiedBy = {
                    username: interaction.user.username,
                    id: interaction.user.id,
                    timestamp: new Date()
                };

                await guildData.save();
                await this.checkAndSendVerificationMessage(guildData);

                return interaction.reply({
                    content: `✅ ${type === 'enabled' ? 'Verification' : 'Disabled'} message updated`,
                    flags: MessageFlags.Ephemeral
                });
            }

            case 'title': {
                const title = interaction.options.getString('title', true);
                
                guildData.verificationTitle = title;
                guildData.verificationLastModifiedBy = {
                    username: interaction.user.username,
                    id: interaction.user.id,
                    timestamp: new Date()
                };

                await guildData.save();
                await this.checkAndSendVerificationMessage(guildData);

                return interaction.reply({
                    content: `✅ Verification title updated to: "${title}"`,
                    flags: MessageFlags.Ephemeral
                });
            }

            case 'footer': {
                const footer = interaction.options.getString('footer');
                
                guildData.verificationFooter = footer;
                guildData.verificationLastModifiedBy = {
                    username: interaction.user.username,
                    id: interaction.user.id,
                    timestamp: new Date()
                };

                await guildData.save();
                await this.checkAndSendVerificationMessage(guildData);

                return interaction.reply({
                    content: footer ? `✅ Verification footer updated` : `✅ Verification footer removed`,
                    flags: MessageFlags.Ephemeral
                });
            }

            case 'thumbnail': {
                const url = interaction.options.getString('url');
                
                // Validate URL if provided
                if (url && !this.isValidImageUrl(url)) {
                    return ErrorHandler.sendCommandError(interaction, 'Invalid image URL. Please provide a direct link to an image (PNG, JPG, GIF).');
                }

                guildData.verificationThumb = url;
                guildData.verificationLastModifiedBy = {
                    username: interaction.user.username,
                    id: interaction.user.id,
                    timestamp: new Date()
                };

                await guildData.save();
                await this.checkAndSendVerificationMessage(guildData);

                return interaction.reply({
                    content: url ? `✅ Verification thumbnail updated` : `✅ Verification thumbnail removed`,
                    flags: MessageFlags.Ephemeral
                });
            }

            case 'status': {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.default as ColorResolvable)
                    .setTitle('🔧 Verification Settings')
                    .setTimestamp();

                // Status indicator
                const isEnabled = guildData.isVerificationModule !== false;
                embed.addFields({
                    name: 'Status',
                    value: isEnabled ? '✅ Enabled' : '❌ Disabled',
                    inline: true
                });

                // Channel
                const channel = guildData.verificationChannelId 
                    ? `<#${guildData.verificationChannelId}>` 
                    : '❌ Not set';
                embed.addFields({
                    name: 'Channel',
                    value: channel,
                    inline: true
                });

                // Role
                const role = guildData.verificationRoleId 
                    ? `<@&${guildData.verificationRoleId}>` 
                    : '❌ Not set';
                embed.addFields({
                    name: 'Role',
                    value: role,
                    inline: true
                });

                // Messages
                embed.addFields({
                    name: 'Verification Message',
                    value: guildData.verificationMessage || 'Default message',
                    inline: false
                });

                if (guildData.verificationDisabledMessage) {
                    embed.addFields({
                        name: 'Disabled Message',
                        value: guildData.verificationDisabledMessage,
                        inline: false
                    });
                }

                // Additional settings
                embed.addFields({
                    name: 'Title',
                    value: guildData.verificationTitle || 'Server Verification',
                    inline: true
                });

                if (guildData.verificationFooter) {
                    embed.addFields({
                        name: 'Footer',
                        value: guildData.verificationFooter,
                        inline: true
                    });
                }

                if (guildData.verificationThumb) {
                    embed.addFields({
                        name: 'Thumbnail',
                        value: '[Image URL](' + guildData.verificationThumb + ')',
                        inline: true
                    });
                    embed.setThumbnail(guildData.verificationThumb);
                }

                // Last modified
                if (guildData.verificationLastModifiedBy) {
                    embed.setFooter({
                        text: `Last modified by ${guildData.verificationLastModifiedBy.username}`,
                    });
                }

                return interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
            }

            default:
                return interaction.reply({
                    content: 'Invalid subcommand.',
                    flags: MessageFlags.Ephemeral
                });
        }
    }

    private async checkAndSendVerificationMessage(guildData: any) {
        // Check if we have all required settings
        if (guildData.verificationChannelId && 
            guildData.verificationRoleId && 
            guildData.isVerificationModule !== false) {
            
            // If we already have a message, update it instead of sending a new one
            if (guildData.verificationMessageId) {
                await this.updateVerificationMessage(guildData);
                return;
            }

            // Send new verification message
            await this.sendVerificationMessage(
                guildData.verificationChannelId,
                guildData.verificationMessage || "Click the button below to verify yourself and gain access to the server!",
                guildData.guildId
            );
        }
    }

    private async sendVerificationMessage(channelId: string, message: string, guildId: string) {
        try {
            const channel = await this.container.client.channels.fetch(channelId);
            const guildData = await Guild.findOne({ guildId });
            
            if (!channel?.isTextBased()) {
                throw new Error('Invalid channel type. Expected text channel.');
            }

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle(guildData?.verificationTitle || 'Server Verification')
                .setDescription(message);

            // Add thumbnail if set
            if (guildData?.verificationThumb) {
                embed.setThumbnail(guildData.verificationThumb);
            }

            // Add footer if set
            if (guildData?.verificationFooter) {
                embed.setFooter({ text: guildData.verificationFooter });
            }

            const button = new ButtonBuilder()
                .setCustomId('verify-button')
                .setLabel('Verify')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✅');

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(button);

            const sentMessage = await (channel as TextChannel).send({
                embeds: [embed],
                components: [row]
            });

            // Save the message ID
            await Guild.updateOne(
                { guildId },
                { verificationMessageId: sentMessage.id }
            );
        } catch (error) {
            console.error('Failed to send verification message:', error);
            throw new Error('Failed to send verification message.');
        }
    }

    private async updateVerificationMessage(guildData: any) {
        if (!guildData.verificationChannelId || !guildData.verificationMessageId) return;

        try {
            const channel = await this.container.client.channels.fetch(guildData.verificationChannelId);
            if (!channel?.isTextBased()) return;

            const message = await (channel as TextChannel).messages.fetch(guildData.verificationMessageId);
            if (!message) return;

            const isEnabled = guildData.isVerificationModule !== false;

            const embed = new EmbedBuilder()
                .setColor(isEnabled ? config.bot.embedColor.default as ColorResolvable : 'Red')
                .setTitle(guildData.verificationTitle || 'Server Verification')
                .setDescription(isEnabled 
                    ? (guildData.verificationMessage || "Click the button below to verify yourself and gain access to the server!")
                    : (guildData.verificationDisabledMessage || "⚠️ Verification is currently disabled. Please try again later."));

            // Add thumbnail if set
            if (guildData.verificationThumb) {
                embed.setThumbnail(guildData.verificationThumb);
            }

            // Add footer if set
            if (guildData.verificationFooter) {
                embed.setFooter({ text: guildData.verificationFooter });
            }

            const button = new ButtonBuilder()
                .setCustomId('verify-button')
                .setLabel('Verify')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✅')
                .setDisabled(!isEnabled);

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(button);

            await message.edit({
                embeds: [embed],
                components: [row]
            });
        } catch (error) {
            console.error('Failed to update verification message:', error);
        }
    }

    private async updateVerificationMessageState(guildData: any, enabled: boolean) {
        if (!guildData.verificationChannelId || !guildData.verificationMessageId) return;

        try {
            const channel = await this.container.client.channels.fetch(guildData.verificationChannelId);
            if (!channel?.isTextBased()) return;

            const message = await (channel as TextChannel).messages.fetch(guildData.verificationMessageId);
            if (!message) return;

            const embed = new EmbedBuilder()
                .setColor(enabled ? config.bot.embedColor.default as ColorResolvable : 'Red')
                .setTitle(guildData.verificationTitle || 'Server Verification')
                .setDescription(enabled 
                    ? (guildData.verificationMessage || "Click the button below to verify yourself and gain access to the server!")
                    : (guildData.verificationDisabledMessage || "⚠️ Verification is currently disabled. Please try again later."));

            // Add thumbnail if set
            if (guildData.verificationThumb) {
                embed.setThumbnail(guildData.verificationThumb);
            }

            // Add footer if set
            if (guildData.verificationFooter) {
                embed.setFooter({ text: guildData.verificationFooter });
            }

            const button = new ButtonBuilder()
                .setCustomId('verify-button')
                .setLabel('Verify')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✅')
                .setDisabled(!enabled);

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(button);

            await message.edit({
                embeds: [embed],
                components: [row]
            });
        } catch (error) {
            console.error('Failed to update verification message:', error);
        }
    }

    private isValidImageUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url);
            const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
            return validExtensions.some(ext => parsedUrl.pathname.toLowerCase().endsWith(ext));
        } catch {
            return false;
        }
    }
}
