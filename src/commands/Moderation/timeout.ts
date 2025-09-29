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

export class TimeoutCommand extends ModuleCommand<ModerationModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Moderation',
            description: 'Timeout a member in the server',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('timeout')
                .setDescription('Timeout a member')
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addUserOption((option) =>
                    option
                        .setName('target')
                        .setDescription('The member to timeout')
                        .setRequired(true)
                )
                .addNumberOption((option) =>
                    option
                        .setName('duration')
                        .setDescription('Duration in minutes')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(40320) // 28 days
                )
                .addStringOption((option) =>
                    option
                        .setName('reason')
                        .setDescription('The reason for the timeout')
                        .setRequired(false)
                )
                .addStringOption((option) =>
                    option
                        .setName('message')
                        .setDescription('Custom message to send on timeout')
                        .setRequired(false)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const target = interaction.options.getMember('target') as GuildMember;
        const duration = interaction.options.getNumber('duration', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!target) {
            return interaction.reply({ content: 'Unable to find that member.', flags: MessageFlags.Ephemeral });
        }

        if (!target.moderatable) {
            return interaction.reply({ content: 'I cannot timeout that member.', flags: MessageFlags.Ephemeral });
        }

        const customMessage = interaction.options.getString('message');
        
        // Handle custom message with variable replacement
        let messageText: string;
        if (customMessage) {
            messageText = customMessage
                .replace(/\$user/g, target.user.tag)
                .replace(/\$mod/g, interaction.user.tag)
                .replace(/\$duration/g, duration.toString());
        } else {
            messageText = getReply('timeout', { 
                user: target.user.tag, 
                mod: interaction.user.tag,
                duration: duration.toString()
            });
        }

        try {
            await target.timeout(duration * 60 * 1000, reason);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setDescription(messageText)
                .setFooter({
                    text: `Mod: ${interaction.user.tag} · ${new Date().toLocaleString()}`
                });

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({
                content: 'There was an error while timing out the member.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}