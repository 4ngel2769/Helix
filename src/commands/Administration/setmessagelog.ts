import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, EmbedBuilder, ChannelType, TextChannel } from 'discord.js';
import { Guild } from '../../models/Guild';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import { AdministrationModule } from '../../modules/Administration';

@ApplyOptions<Command.Options>({
    name: 'setmessagelog',
    description: 'Set the message edit/delete log channels',
    aliases: ['setmsgl', 'smsgl'],
    preconditions: ['GuildOnly']
})
export class SetMessageLogCommand extends ModuleCommand<AdministrationModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Administration'
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('edit')
                        .setDescription('Set the message edit log channel')
                        .addChannelOption((option) =>
                            option
                                .setName('channel')
                                .setDescription('The message edit log channel (leave empty to clear)')
                                .setRequired(false)
                                .addChannelTypes(ChannelType.GuildText)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('delete')
                        .setDescription('Set the message delete log channel')
                        .addChannelOption((option) =>
                            option
                                .setName('channel')
                                .setDescription('The message delete log channel (leave empty to clear)')
                                .setRequired(false)
                                .addChannelTypes(ChannelType.GuildText)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('both')
                        .setDescription('Set both message edit and delete log to the same channel')
                        .addChannelOption((option) =>
                            option
                                .setName('channel')
                                .setDescription('The message log channel (leave empty to clear both)')
                                .setRequired(false)
                                .addChannelTypes(ChannelType.GuildText)
                        )
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .setDMPermission(false)
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guild) {
            return interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const channel = interaction.options.getChannel('channel') as TextChannel | null;

        try {
            let guildData = await Guild.findOne({ guildId: interaction.guild.id });
            
            if (!guildData) {
                guildData = new Guild({
                    guildId: interaction.guild.id
                });
            }

            if (subcommand === 'edit') {
                return this.handleEdit(interaction, guildData, channel);
            } else if (subcommand === 'delete') {
                return this.handleDelete(interaction, guildData, channel);
            } else if (subcommand === 'both') {
                return this.handleBoth(interaction, guildData, channel);
            }

        } catch (error) {
            console.error('Error setting message log:', error);
            return interaction.reply({ 
                content: '❌ An error occurred while setting the message log channel.', 
                ephemeral: true 
            });
        }
    }

    private async handleEdit(interaction: Command.ChatInputCommandInteraction, guildData: any, channel: TextChannel | null) {
        if (!channel) {
            guildData.messageEditLogChannelId = null;
            await guildData.save();

            const embed = new EmbedBuilder()
                .setColor('#49e358')
                .setTitle('✅ Message Edit Log Cleared')
                .setDescription('The message edit log channel has been cleared.')
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (channel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: '❌ Please select a text channel.', ephemeral: true });
        }

        guildData.messageEditLogChannelId = channel.id;
        await guildData.save();

        const embed = new EmbedBuilder()
            .setColor('#49e358')
            .setTitle('✅ Message Edit Log Set')
            .setDescription(`Message edits will now be logged to ${channel}`)
            .addFields({
                name: 'What Gets Logged',
                value: '• Original message content\n• Edited message content\n• Author and channel information\n• Timestamp of edit',
                inline: false
            })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    private async handleDelete(interaction: Command.ChatInputCommandInteraction, guildData: any, channel: TextChannel | null) {
        if (!channel) {
            guildData.messageDeleteLogChannelId = null;
            await guildData.save();

            const embed = new EmbedBuilder()
                .setColor('#49e358')
                .setTitle('✅ Message Delete Log Cleared')
                .setDescription('The message delete log channel has been cleared.')
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (channel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: '❌ Please select a text channel.', ephemeral: true });
        }

        guildData.messageDeleteLogChannelId = channel.id;
        await guildData.save();

        const embed = new EmbedBuilder()
            .setColor('#49e358')
            .setTitle('✅ Message Delete Log Set')
            .setDescription(`Message deletions will now be logged to ${channel}`)
            .addFields({
                name: 'What Gets Logged',
                value: '• Deleted message content\n• Author and channel information\n• Attachments (if any)\n• Timestamp of deletion',
                inline: false
            })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    private async handleBoth(interaction: Command.ChatInputCommandInteraction, guildData: any, channel: TextChannel | null) {
        if (!channel) {
            guildData.messageEditLogChannelId = null;
            guildData.messageDeleteLogChannelId = null;
            await guildData.save();

            const embed = new EmbedBuilder()
                .setColor('#49e358')
                .setTitle('✅ Message Logs Cleared')
                .setDescription('Both message edit and delete log channels have been cleared.')
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (channel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: '❌ Please select a text channel.', ephemeral: true });
        }

        guildData.messageEditLogChannelId = channel.id;
        guildData.messageDeleteLogChannelId = channel.id;
        await guildData.save();

        const embed = new EmbedBuilder()
            .setColor('#49e358')
            .setTitle('✅ Message Logs Set')
            .setDescription(`Both message edits and deletions will now be logged to ${channel}`)
            .addFields({
                name: 'What Gets Logged',
                value: '• Message edits (before/after)\n• Message deletions\n• Author and channel information\n• Attachments\n• Timestamps',
                inline: false
            })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
}
