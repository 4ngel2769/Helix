import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction, MessageFlags, EmbedBuilder, ColorResolvable } from 'discord.js';
import { Guild } from '../models/Guild';
import config from '../config';

export class VerificationButtonHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.Context, options: InteractionHandler.Options) {
        super(context, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override parse(interaction: ButtonInteraction) {
        if (interaction.customId !== 'verify-button') return this.none();
        return this.some();
    }

    public async run(interaction: ButtonInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const guildId = interaction.guildId!;
            const guildData = await Guild.findOne({ guildId });

            // Check if verification is enabled and configured
            if (!guildData?.verificationRoleId || guildData.isVerificationModule === false) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.warn as ColorResolvable)
                    .setTitle('⚠️ Verification Unavailable')
                    .setDescription(guildData?.verificationDisabledMessage || 
                        "Verification is currently disabled. Please try again later.")
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const member = interaction.member;
            if (!member) {
                return interaction.editReply({ 
                    content: 'Unable to verify you. Please try again later.' 
                });
            }

            // Check if user is already verified
            let hasRole = false;
            if (Array.isArray(member.roles)) {
                hasRole = member.roles.includes(guildData.verificationRoleId);
            } else {
                hasRole = member.roles.cache.has(guildData.verificationRoleId);
            }

            if (hasRole) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.success as ColorResolvable)
                    .setTitle('✅ Already Verified')
                    .setDescription('You are already verified in this server!')
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            // Check bot permissions
            const botMember = interaction.guild?.members.me;
            if (!botMember?.permissions.has('ManageRoles')) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err as ColorResolvable)
                    .setTitle('❌ Missing Permissions')
                    .setDescription('I don\'t have permission to manage roles. Please contact a server administrator.')
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            // Verify the role exists and is manageable
            const verificationRole = interaction.guild?.roles.cache.get(guildData.verificationRoleId);
            if (!verificationRole) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err as ColorResolvable)
                    .setTitle('❌ Configuration Error')
                    .setDescription('The verification role no longer exists. Please contact a server administrator.')
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            if (verificationRole.position >= botMember.roles.highest.position) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err as ColorResolvable)
                    .setTitle('❌ Role Hierarchy Error')
                    .setDescription('I cannot assign the verification role due to role hierarchy. Please contact a server administrator.')
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            // Add the verification role
            if (Array.isArray(member.roles)) {
                return interaction.editReply({
                    content: 'Unable to verify you. Please contact a server administrator.'
                });
            }

            await member.roles.add(guildData.verificationRoleId);

            // Send success message
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('✅ Verification Successful')
                .setDescription('You have been successfully verified! Welcome to the server.')
                .addFields({
                    name: 'Role Assigned',
                    value: `<@&${guildData.verificationRoleId}>`,
                    inline: true
                })
                .setTimestamp();

            // Log verification for moderation
            this.container.logger.info(`User ${interaction.user.tag} (${interaction.user.id}) verified in guild ${interaction.guild?.name} (${guildId})`);

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Failed to verify member:', error);
            
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Verification Failed')
                .setDescription('An error occurred during verification. Please try again later or contact a server administrator.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }
}
