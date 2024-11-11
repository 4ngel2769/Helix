import { ModuleCommand } from '@kbotdev/plugin-modules';
import { Command } from '@sapphire/framework';
import { ModerationModule } from '../../modules/Moderation';
import { EmbedBuilder, GuildMember, PermissionFlagsBits, ColorResolvable } from 'discord.js';
import config from '../../config';

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
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const target = interaction.options.getMember('target') as GuildMember;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!target) {
            return interaction.reply({ content: 'Unable to find that member.', ephemeral: true });
        }

        if (!target.kickable) {
            return interaction.reply({ content: 'I cannot kick that member.', ephemeral: true });
        }

        try {
            await target.kick(reason);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle('Member Kicked')
                .addFields(
                    { name: 'Member', value: `${target.user.tag} (${target.id})` },
                    { name: 'Moderator', value: `${interaction.user.tag}` },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({ 
                content: 'There was an error while kicking the member.',
                ephemeral: true 
            });
        }
    }
} 