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
    TextChannel
} from 'discord.js';
import { Guild } from '../../models/Guild';
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
                        .setDescription('Set the verification message')
                        .addStringOption((option) =>
                            option
                                .setName('message')
                                .setDescription('The message to display in the verification channel')
                                .setRequired(true)
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
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId!;
        let guildData = await Guild.findOne({ guildId });

        if (!guildData) {
            guildData = new Guild({ guildId });
        }

        switch (subcommand) {
            case 'channel': {
                const channel = interaction.options.getChannel('channel', true);
                guildData.verificationChannelId = channel.id;
                await guildData.save();

                // Check if all requirements are met to send verification message
                await this.checkAndSendVerificationMessage(guildData);

                return interaction.reply({
                    content: `Verification channel set to ${channel}`,
                    ephemeral: true
                });
            }

            case 'role': {
                const role = interaction.options.getRole('role', true);
                guildData.verificationRoleId = role.id;
                await guildData.save();

                // Check if all requirements are met to send verification message
                await this.checkAndSendVerificationMessage(guildData);

                return interaction.reply({
                    content: `Verification role set to ${role}`,
                    ephemeral: true
                });
            }

            case 'toggle': {
                const enabled = interaction.options.getBoolean('enabled', true);
                guildData.isVerificationModule = enabled;
                await guildData.save();

                if (enabled) {
                    // If enabling and we have all requirements, send the message
                    await this.checkAndSendVerificationMessage(guildData);
                } else {
                    // If disabling, update the message to show disabled state
                    await this.updateVerificationMessageState(guildData, false);
                }

                return interaction.reply({
                    content: `Verification system has been ${enabled ? 'enabled' : 'disabled'}.`,
                    ephemeral: true
                });
            }

            case 'message': {
                const message = interaction.options.getString('message', true);
                guildData.verificationMessage = message;
                await guildData.save();

                // Update verification message if it exists
                if (guildData.verificationChannelId && guildData.verificationMessageId) {
                    await this.updateVerificationMessage(
                        guildData.verificationChannelId,
                        guildData.verificationMessageId,
                        message
                    );
                }

                return interaction.reply({
                    content: 'Verification message updated',
                    ephemeral: true
                });
            }

            case 'status': {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.default as ColorResolvable)
                    .setTitle('Verification Settings')
                    .addFields(
                        { 
                            name: 'Channel', 
                            value: guildData.verificationChannelId 
                                ? `<#${guildData.verificationChannelId}>` 
                                : 'Not set'
                        },
                        { 
                            name: 'Role', 
                            value: guildData.verificationRoleId 
                                ? `<@&${guildData.verificationRoleId}>` 
                                : 'Not set'
                        },
                        { 
                            name: 'Message', 
                            value: guildData.verificationMessage || 'Default message'
                        }
                    );

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }

            default:
                return interaction.reply({
                    content: 'Invalid subcommand.',
                    ephemeral: true
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
                guildData.verificationMessage || "Click the button below to verify yourself and gain access to the server!"
            );
        }
    }

    private async sendVerificationMessage(channelId: string, message: string) {
        const channel = await this.container.client.channels.fetch(channelId);
        if (!channel?.isTextBased()) return;

        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default as ColorResolvable)
            .setTitle('Server Verification')
            .setDescription(message);

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
                .setTitle('Server Verification')
                .setDescription(enabled 
                    ? (guildData.verificationMessage || "Click the button below to verify yourself and gain access to the server!")
                    : "⚠️ Verification is currently disabled");

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

    private async updateVerificationMessage(channelId: string, messageId: string, newMessage: string) {
        try {
            const channel = await this.container.client.channels.fetch(channelId);
            if (!channel?.isTextBased()) return;

            const message = await channel.messages.fetch(messageId);
            if (!message) return;

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle('Server Verification')
                .setDescription(newMessage);

            await message.edit({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to update verification message:', error);
        }
    }
} 