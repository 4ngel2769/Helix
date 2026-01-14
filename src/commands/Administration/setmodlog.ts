import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, EmbedBuilder, ChannelType, TextChannel } from 'discord.js';
import { Guild } from '../../models/Guild';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import { AdministrationModule } from '../../modules/Administration';

@ApplyOptions<Command.Options>({
    name: 'setmodlog',
    description: 'Set the moderation log channel',
    aliases: ['setml', 'sml'],
    preconditions: ['GuildOnly']
})
export class SetModLogCommand extends ModuleCommand<AdministrationModule> {
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
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('The mod log channel (leave empty to clear)')
                        .setRequired(false)
                        .addChannelTypes(ChannelType.GuildText)
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .setDMPermission(false)
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guild) {
            return interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel') as TextChannel | null;

        try {
            let guildData = await Guild.findOne({ guildId: interaction.guild.id });
            
            if (!guildData) {
                guildData = new Guild({
                    guildId: interaction.guild.id
                });
            }

            if (!channel) {
                // Clear mod log
                guildData.modLogChannelId = null;
                await guildData.save();

                const embed = new EmbedBuilder()
                    .setColor('#49e358')
                    .setTitle('✅ Mod Log Cleared')
                    .setDescription('The moderation log channel has been cleared.')
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            // Validate channel type
            if (channel.type !== ChannelType.GuildText) {
                return interaction.reply({ 
                    content: '❌ Please select a text channel.', 
                    ephemeral: true 
                });
            }

            // Set mod log
            guildData.modLogChannelId = channel.id;
            await guildData.save();

            const embed = new EmbedBuilder()
                .setColor('#49e358')
                .setTitle('✅ Mod Log Set')
                .setDescription(`Moderation actions will now be logged to ${channel}`)
                .addFields(
                    {
                        name: 'Channel',
                        value: `${channel.name} (${channel.id})`,
                        inline: true
                    },
                    {
                        name: 'What Gets Logged',
                        value: '• Bans/Unbans\n• Kicks\n• Timeouts\n• Warnings\n• Role changes\n• Other mod actions',
                        inline: false
                    }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error setting mod log:', error);
            return interaction.reply({ 
                content: '❌ An error occurred while setting the mod log channel.', 
                ephemeral: true 
            });
        }
    }
}
