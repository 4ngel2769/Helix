import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, GuildMember, PermissionFlagsBits, ColorResolvable } from 'discord.js';
import config from '../../config';

@ApplyOptions<Command.Options>({
    name: 'ban',
    description: 'Ban a member from the server',
    preconditions: ['GuildOnly', 'ModeratorOnly'],
    enabled: true
})
export class BanCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        console.log('Registering ban command...');
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
        );
        console.log('Ban command registered!');
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const target = interaction.options.getMember('target') as GuildMember;
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const days = interaction.options.getNumber('days') || 0;

        if (!target) {
            return interaction.reply({ content: 'Unable to find that member.', ephemeral: true });
        }

        if (!target.bannable) {
            return interaction.reply({ content: 'I cannot ban that member.', ephemeral: true });
        }

        try {
            await target.ban({ deleteMessageDays: days, reason });

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle('Member Banned')
                .addFields(
                    { name: 'Member', value: `${target.user.tag} (${target.id})` },
                    { name: 'Moderator', value: `${interaction.user.tag}` },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({ 
                content: 'There was an error while banning the member.',
                ephemeral: true 
            });
        }
    }
} 