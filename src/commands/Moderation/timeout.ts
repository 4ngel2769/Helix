import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, GuildMember, PermissionFlagsBits, ColorResolvable } from 'discord.js';
import config from '../../config';

@ApplyOptions<Command.Options>({
    name: 'timeout',
    description: 'Timeout a member in the server',
    preconditions: ['GuildOnly', 'ModeratorOnly'],
    enabled: true
})
export class TimeoutCommand extends Command {
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
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const target = interaction.options.getMember('target') as GuildMember;
        const duration = interaction.options.getNumber('duration', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!target) {
            return interaction.reply({ content: 'Unable to find that member.', ephemeral: true });
        }

        if (!target.moderatable) {
            return interaction.reply({ content: 'I cannot timeout that member.', ephemeral: true });
        }

        try {
            await target.timeout(duration * 60 * 1000, reason);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle('Member Timed Out')
                .addFields(
                    { name: 'Member', value: `${target.user.tag} (${target.id})` },
                    { name: 'Moderator', value: `${interaction.user.tag}` },
                    { name: 'Duration', value: `${duration} minutes` },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({ 
                content: 'There was an error while timing out the member.',
                ephemeral: true 
            });
        }
    }
} 