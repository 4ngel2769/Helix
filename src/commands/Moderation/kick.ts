import { ModuleCommand } from '@kbotdev/plugin-modules';
import { Command } from '@sapphire/framework';
import { ModerationModule } from '../../modules/Moderation';
import {
    EmbedBuilder,
    GuildMember,
    PermissionFlagsBits,
    ColorResolvable,
    MessageFlags
} from 'discord.js';
import config from '../../config';
import { getReply } from '../../lib/utils/replies';

export class KickCommand extends ModuleCommand<ModerationModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Moderation',
            description: 'Kick a member from the server',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('kick')
                .setDescription('Kick a member from the server')
                .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
                .addUserOption((option) =>
                    option
                        .setName('target')
                        .setDescription('The member to kick')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('reason')
                        .setDescription('The reason for the kick')
                        .setRequired(false)
                )
                .addStringOption((option) =>
                    option
                        .setName('message')
                        .setDescription('Custom message to send on kick')
                        .setRequired(false)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const target = interaction.options.getMember('target') as GuildMember;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!target) {
            return interaction.reply({ content: 'Unable to find that member.', flags: MessageFlags.Ephemeral });
        }

        if (!target.kickable) {
            return interaction.reply({ content: 'I cannot kick that member.', flags: MessageFlags.Ephemeral });
        }

        const customMessage = interaction.options.getString('message');
        
        // Handle custom message with variable replacement
        let messageText: string;
        if (customMessage) {
            messageText = customMessage
                .replace(/\$user/g, target.user.tag)
                .replace(/\$mod/g, interaction.user.tag);
        } else {
            messageText = getReply('kick', { user: target.user.tag, mod: interaction.user.tag });
        }

        try {
            await target.kick(reason);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setDescription(messageText)
                .setFooter({
                    text: `Mod: ${interaction.user.tag} · ${new Date().toLocaleString()}`
                });

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({
                content: 'There was an error while kicking the member.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}