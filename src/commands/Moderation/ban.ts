import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
    EmbedBuilder,
    GuildMember,
    PermissionFlagsBits,
    ColorResolvable,
    MessageFlags
} from 'discord.js';
import config from '../../config';
import { getReply } from '../../lib/utils/replies';

@ApplyOptions<ModuleCommand.Options>({
    module: 'Moderation',
    description: 'Ban a member from the server',
    enabled: true
})
export class BanCommand extends ModuleCommand<ModerationModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            description: 'Ban a member from the server',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('ban')
                .setDescription('Ban a member from the server')
                .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
                .addUserOption((option) =>
                    option
                        .setName('target')
                        .setDescription('The member to ban')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('reason')
                        .setDescription('The reason for the ban')
                        .setRequired(false)
                )
                .addNumberOption((option) =>
                    option
                        .setName('days')
                        .setDescription('Number of days of messages to delete (0-7)')
                        .setMinValue(0)
                        .setMaxValue(7)
                        .setRequired(false)
                )
                .addStringOption((option) =>
                    option
                        .setName('message')
                        .setDescription('Custom message to send on ban')
                        .setRequired(false)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const target = interaction.options.getMember('target') as GuildMember;
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const days = interaction.options.getNumber('days') || 0;

        if (!target) {
            return interaction.reply({ content: 'Unable to find that member.', flags: MessageFlags.Ephemeral });
        }

        if (!target.bannable) {
            return interaction.reply({ content: 'I cannot ban that member.', flags: MessageFlags.Ephemeral });
        }

        const customMessage = interaction.options.getString('message');
        
        // Handle custom message with variable replacement
        let messageText: string;
        if (customMessage) {
            messageText = customMessage
                .replace(/\$user/g, target.user.tag)
                .replace(/\$mod/g, interaction.user.tag);
        } else {
            messageText = getReply('ban', { user: target.user.tag, mod: interaction.user.tag });
        }

        try {
            await target.ban({ deleteMessageDays: days, reason });

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setDescription(messageText)
                .setFooter({
                    text: `Mod: ${interaction.user.tag} · ${new Date().toLocaleString()}`
                });

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } catch (error) {
            return interaction.reply({
                content: 'There was an error while banning the member.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}
