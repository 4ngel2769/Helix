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
import { Guild, type IGuild } from '../../models/Guild';
import { ErrorHandler } from '../../lib/structures/ErrorHandler';
import config from '../../config';

@ApplyOptions<Command.Options>({
    name: 'setup-verification',
    description: 'Quick setup for verification system',
    preconditions: ['GuildOnly', 'ModeratorOnly']
})
export class SetupVerificationCommand extends ModuleCommand<VerificationModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Verification',
            description: 'Quick setup for verification system',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('setup-verification')
                .setDescription('Quick setup for verification system')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('The channel to use for verification')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addRoleOption((option) =>
                    option
                        .setName('role')
                        .setDescription('The role to give upon verification')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('message')
                        .setDescription('Custom verification message (optional)')
                        .setRequired(false)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const channel = interaction.options.getChannel('channel', true) as TextChannel;
            const role = interaction.options.getRole('role', true);
            const customMessage = interaction.options.getString('message');

            // Validate permissions
            const botMember = interaction.guild?.members.me;
            if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return ErrorHandler.sendPermissionError(interaction, 'ManageRoles');
            }

            // Check bot permissions in channel
            const hasChannelPerms = await ErrorHandler.checkPermissions(channel, [
                'SendMessages',
                'ViewChannel',
                'EmbedLinks'
            ]);

            if (!hasChannelPerms) {
                return ErrorHandler.sendPermissionError(interaction, 'SendMessages');
            }

            // Check role hierarchy
            if (role.position >= botMember.roles.highest.position) {
                return ErrorHandler.sendCommandError(interaction, 
                    'I cannot manage this role. Make sure my highest role is above the verification role.');
            }

            // Check if role is managed by integration
            if (role.managed) {
                return ErrorHandler.sendCommandError(interaction, 
                    'Cannot use a managed role (bot role or integration role) for verification.');
            }

            const guildId = interaction.guildId!;
            let guildData = await Guild.findOne({ guildId });

            if (!guildData) {
                guildData = new Guild({ guildId });
            }

            // Configure verification settings
            guildData.verificationChannelId = channel.id;
            guildData.verificationRoleId = role.id;
            guildData.isVerificationModule = true;
            
            if (customMessage) {
                guildData.verificationMessage = customMessage;
            }

            guildData.verificationLastModifiedBy = {
                username: interaction.user.username,
                id: interaction.user.id,
                timestamp: new Date()
            };

            await guildData.save();

            // Send verification message to the channel
            await this.sendVerificationMessage(channel, guildData);

            // Success response
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('✅ Verification Setup Complete')
                .setDescription('Verification system has been successfully configured!')
                .addFields(
                    {
                        name: 'Channel',
                        value: `${channel}`,
                        inline: true
                    },
                    {
                        name: 'Role',
                        value: `${role}`,
                        inline: true
                    },
                    {
                        name: 'Status',
                        value: '✅ Enabled',
                        inline: true
                    }
                )
                .setFooter({ text: 'Use /verification to modify settings' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Setup verification error:', error);
            return ErrorHandler.sendCommandError(interaction, 
                'Failed to setup verification. Please try again.');
        }
    }

    private async sendVerificationMessage(channel: TextChannel, guildData: IGuild) {
        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default as ColorResolvable)
            .setTitle(guildData.verificationTitle || 'Server Verification')
            .setDescription(guildData.verificationMessage || 
                'Click the button below to verify yourself and gain access to the server!');

        const button = new ButtonBuilder()
            .setCustomId('verify-button')
            .setLabel('Verify')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✅');

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(button);

        const sentMessage = await channel.send({
            embeds: [embed],
            components: [row]
        });

        // Update guild data with message ID
        await Guild.updateOne(
            { guildId: guildData.guildId },
            { verificationMessageId: sentMessage.id }
        );
    }
}
