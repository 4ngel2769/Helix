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

                // If we have all required settings, send the verification message
                if (guildData.verificationRoleId && guildData.verificationMessage) {
                    await this.sendVerificationMessage(channel.id, guildData.verificationMessage);
                }

                return interaction.reply({
                    content: `Verification channel set to ${channel}`,
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

            case 'role': {
                const role = interaction.options.getRole('role', true);
                guildData.verificationRoleId = role.id;
                await guildData.save();

                return interaction.reply({
                    content: `Verification role set to ${role}`,
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