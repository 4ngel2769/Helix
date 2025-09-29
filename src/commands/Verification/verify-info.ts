import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { VerificationModule } from '../../modules/Verification';
import { EmbedBuilder, MessageFlags, ColorResolvable } from 'discord.js';
import { Guild } from '../../models/Guild';
import config from '../../config';

@ApplyOptions<Command.Options>({
    name: 'verify-info',
    description: 'Information about server verification'
})
export class VerifyInfoCommand extends ModuleCommand<VerificationModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Verification',
            description: 'Information about server verification',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('verify-info')
                .setDescription('Information about server verification')
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const guildId = interaction.guildId!;
        const guildData = await Guild.findOne({ guildId });

        if (!guildData?.isVerificationModule || !guildData.verificationRoleId) {
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.warn as ColorResolvable)
                .setTitle('❌ Verification Not Configured')
                .setDescription('This server does not have verification enabled.')
                .setTimestamp();

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const member = interaction.member;
        let isVerified = false;

        if (member) {
            if (Array.isArray(member.roles)) {
                isVerified = member.roles.includes(guildData.verificationRoleId);
            } else {
                isVerified = member.roles.cache.has(guildData.verificationRoleId);
            }
        }

        const embed = new EmbedBuilder()
            .setColor(isVerified ? 
                config.bot.embedColor.success as ColorResolvable : 
                config.bot.embedColor.default as ColorResolvable)
            .setTitle('🔐 Server Verification Info')
            .setDescription(isVerified ? 
                '✅ You are verified in this server!' : 
                '❌ You are not yet verified in this server.')
            .addFields(
                {
                    name: 'Verification Channel',
                    value: guildData.verificationChannelId ? 
                        `<#${guildData.verificationChannelId}>` : 
                        'Not configured',
                    inline: true
                },
                {
                    name: 'Verification Role',
                    value: `<@&${guildData.verificationRoleId}>`,
                    inline: true
                },
                {
                    name: 'Status',
                    value: guildData.isVerificationModule ? 
                        '✅ Enabled' : 
                        '❌ Disabled',
                    inline: true
                }
            )
            .setTimestamp();

        if (!isVerified && guildData.verificationChannelId) {
            embed.addFields({
                name: 'How to Verify',
                value: `Go to <#${guildData.verificationChannelId}> and click the verification button.`,
                inline: false
            });
        }

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}
