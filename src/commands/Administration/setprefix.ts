import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Guild } from '../../models/Guild';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import { AdministrationModule } from '../../modules/Administration';

@ApplyOptions<Command.Options>({
    name: 'setprefix',
    description: 'Set the command prefix for your server',
    aliases: ['setp', 'sp'],
    preconditions: ['GuildOnly']
})
export class SetPrefixCommand extends ModuleCommand<AdministrationModule> {
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
                .addStringOption((option) =>
                    option
                        .setName('prefix')
                        .setDescription('The new prefix (max 3 characters, leave empty to reset to default)')
                        .setRequired(false)
                        .setMaxLength(3)
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .setDMPermission(false)
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guild) {
            return interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
        }

        const prefix = interaction.options.getString('prefix');
        const defaultPrefix = this.container.client.options.defaultPrefix || '!';

        try {
            let guildData = await Guild.findOne({ guildId: interaction.guild.id });
            
            if (!guildData) {
                guildData = new Guild({
                    guildId: interaction.guild.id
                });
            }

            if (!prefix) {
                // Reset to default
                guildData.prefix = null;
                await guildData.save();

                const embed = new EmbedBuilder()
                    .setColor('#49e358')
                    .setTitle('✅ Prefix Reset')
                    .setDescription(`The command prefix has been reset to the default: \`${defaultPrefix}\``)
                    .addFields({
                        name: 'ℹ️ Note',
                        value: 'Slash commands (/) will always work regardless of prefix setting.',
                        inline: false
                    })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            // Validate prefix
            if (prefix.length > 3) {
                return interaction.reply({ 
                    content: '❌ The prefix cannot be longer than 3 characters.', 
                    ephemeral: true 
                });
            }

            if (prefix.includes(' ')) {
                return interaction.reply({ 
                    content: '❌ The prefix cannot contain spaces.', 
                    ephemeral: true 
                });
            }

            // Set new prefix
            guildData.prefix = prefix;
            await guildData.save();

            const embed = new EmbedBuilder()
                .setColor('#49e358')
                .setTitle('✅ Prefix Updated')
                .setDescription(`The command prefix has been set to: \`${prefix}\``)
                .addFields(
                    {
                        name: 'Old Prefix',
                        value: `\`${defaultPrefix}\``,
                        inline: true
                    },
                    {
                        name: 'New Prefix',
                        value: `\`${prefix}\``,
                        inline: true
                    },
                    {
                        name: 'ℹ️ Note',
                        value: 'Slash commands (/) will always work regardless of prefix setting.',
                        inline: false
                    }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error setting prefix:', error);
            return interaction.reply({ 
                content: '❌ An error occurred while setting the prefix.', 
                ephemeral: true 
            });
        }
    }
}
