import { ModuleCommand } from '@kbotdev/plugin-modules';
import { VerificationModule } from '../../modules/Verification';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { 
    ChannelType, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ColorResolvable,
    TextChannel,
    MessageFlags
} from 'discord.js';
import { Guild } from '../../models/Guild';
import config from '../../config';
import { ErrorHandler } from '../../lib/structures/ErrorHandler';

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
                    content: `Verification channel set to ${channel}`,
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

                guildData.verificationRoleId = role.id;
                await guildData.save();

                // Check if channel is set
                if (!guildData.verificationChannelId) {
                    return ErrorHandler.sendMissingSetupError(interaction, ['Verification Channel']);
                }

                await this.checkAndSendVerificationMessage(guildData);
                return interaction.reply({
                    content: `Verification role set to ${role}`,
                    flags: MessageFlags.Ephemeral
                });
            }

            case 'toggle': {
                const enabled = interaction.options.getBoolean('enabled', true);
                guildData.isVerificationModule = enabled;
                
                // Update last modified info
                // Fix the userId property issue
                guildData.verificationLastModifiedBy = {
                    username: interaction.user.username,
                    id: interaction.user.id,
                    timestamp: new Date()
                };
                
                await guildData.save();

                if (enabled) {
                    await this.checkAndSendVerificationMessage(guildData);
                } else {
                    await this.updateVerificationMessageState(guildData, false);
                }

                return interaction.reply({
                    content: `Verification system has been ${enabled ? 'enabled' : 'disabled'}.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            case 'message': {
                const messageType = interaction.options.getString('type', true);
                const message = interaction.options.getString('message', true);

                if (messageType === 'enabled') {
                    guildData.verificationMessage = message;
                } else {
                    guildData.verificationDisabledMessage = message;
                }
                
                await guildData.save();

                // Update verification message if it exists
                if (guildData.verificationChannelId && guildData.verificationMessageId) {
                    await this.updateVerificationMessageState(
                        guildData,
                        guildData.isVerificationModule || false
                    );
                }

                return interaction.reply({
                    content: `${messageType === 'enabled' ? 'Verification' : 'Disabled'} message updated`,
                    flags: MessageFlags.Ephemeral
                });
            }

            case 'title': {
                const title = interaction.options.getString('title', true);
                guildData.verificationTitle = title;
                await guildData.save();

                // Update verification message if it exists
                if (guildData.verificationChannelId && guildData.verificationMessageId) {
                    await this.updateVerificationMessageState(
                        guildData,
                        guildData.isVerificationModule || false
                    );
                }

                return interaction.reply({
                    content: `Verification title updated to "${title}"`,
                    flags: MessageFlags.Ephemeral
                });
            }

            case 'footer': {
                const footer = interaction.options.getString('footer', true);
                guildData.verificationFooter = footer;
                await guildData.save();

                // Update verification message if it exists
                if (guildData.verificationChannelId && guildData.verificationMessageId) {
                    await this.updateVerificationMessageState(
                        guildData,
                        guildData.isVerificationModule || false
                    );
                }

                return interaction.reply({
                    content: `Verification footer updated`,
                    flags: MessageFlags.Ephemeral
                });
            }

            case 'thumbnail': {
                const url = interaction.options.getString('url', true);
                
                // Validate URL format
                const urlRegex = /^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)$/i;
                if (!urlRegex.test(url)) {
                    return interaction.reply({
                        content: 'Invalid image URL. Please provide a valid URL ending with .png, .jpg, .jpeg, .gif, or .webp',
                        flags: MessageFlags.Ephemeral
                    });
                }

                guildData.verificationThumb = url;
                await guildData.save();

                // Update verification message if it exists
                if (guildData.verificationChannelId && guildData.verificationMessageId) {
                    await this.updateVerificationMessageState(
                        guildData,
                        guildData.isVerificationModule || false
                    );
                }

                return interaction.reply({
                    content: `Verification thumbnail updated`,
                    flags: MessageFlags.Ephemeral
                });
            }

            case 'status': {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.default as ColorResolvable)
                    .setTitle('Verification Settings')
                    .addFields(
                        { 
                            name: 'Status', 
                            value: guildData.isVerificationModule 
                                ? '<:on:1305487724656070717> Enabled' 
                                : '<:off:1305487877366612109> Disabled',
                            inline: true
                        },
                        { 
                            name: '\`📝\` Last Modified', 
                            value: guildData.verificationLastModifiedBy?.timestamp
                                ? `By: ${guildData.verificationLastModifiedBy.username}\nWhen: <t:${Math.floor(guildData.verificationLastModifiedBy.timestamp.getTime() / 1000)}:R>`
                                : 'No modifications recorded',
                            inline: true
                        },
                        { 
                            name: '\u200B', 
                            value: '\u200B', 
                            inline: true 
                        },
                        { 
                            name: '\`📋\` Channel:', 
                            value: guildData.verificationChannelId 
                                ? `<#${guildData.verificationChannelId}>` 
                                : 'Not set',
                            inline: true
                        },
                        { 
                            name: '\`🎭\` Verification Role:', 
                            value: guildData.verificationRoleId 
                                ? `<@&${guildData.verificationRoleId}>` 
                                : 'Not set',
                            inline: true
                        },
                        { 
                            name: '\u200B', 
                            value: '\u200B', 
                            inline: true 
                        },
                        {
                            name: '\`🔴\` "Verification Disabled" Message:',
                            value: guildData.verificationDisabledMessage || 'Verification is currently disabled.'
                        },
                        {
                            name: '\`✅\` Verification Message:',
                            value: guildData.verificationMessage || 'Click the button below to verify yourself and gain access to the server!'
                        },
                        {
                            name: '\`🔤\` Title:',
                            value: guildData.verificationTitle || 'Server Verification'
                        }
                    )
                    .setFooter({
                        text: 'Hint: you can edit any of these settings using the /verification command.'});

                // Add footer and thumbnail info if they exist
                if (guildData.verificationFooter) {
                    embed.addFields({
                        name: '\`🏷️\` Footer:',
                        value: guildData.verificationFooter
                    });
                }

                if (guildData.verificationThumb) {
                    embed.addFields({
                        name: '\`🖼️\` Thumbnail:',
                        value: guildData.verificationThumb
                    });
                    embed.setThumbnail(guildData.verificationThumb);
                }

                if (!guildData.isVerificationModule) {
                    embed.setFooter({ 
                        text: '⚠️ Verification is currently disabled. Use /verification toggle true to enable it.' 
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
                try {
                    const channel = await this.container.client.channels.fetch(guildData.verificationChannelId);
                    if (channel?.isTextBased()) {
                        const message = await (channel as TextChannel).messages.fetch(guildData.verificationMessageId);
                        if (message) {
                            await this.updateVerificationMessageState(guildData, true);
                            return;
                        }
                    }
                } catch (error) {
                    // Message not found, send a new one
                }
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
        const channel = await this.container.client.channels.fetch(channelId);
        const guildData = await Guild.findOne({ guildId });
        if (!channel?.isTextBased()) {
            throw new Error('Invalid channel type. Expected text channel.');
        }

        try {
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
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(button);

            const sentMessage = await (channel as TextChannel).send({
                embeds: [embed],
                components: [row]
            });

            // Save the message ID
            await Guild.updateOne(
                { verificationChannelId: channelId },
                { verificationMessageId: sentMessage.id }
            );
        } catch (error) {
            throw new Error('Failed to send verification message.');
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
}