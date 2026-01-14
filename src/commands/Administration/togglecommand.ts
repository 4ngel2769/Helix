import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Guild } from '../../models/Guild';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import { AdministrationModule } from '../../modules/Administration';

@ApplyOptions<Command.Options>({
    name: 'togglecommand',
    description: 'Enable or disable a specific command',
    aliases: ['togglec', 'togc', 'tc'],
    preconditions: ['GuildOnly']
})
export class ToggleCommandCommand extends ModuleCommand<AdministrationModule> {
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
                        .setName('command')
                        .setDescription('The command to enable/disable')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('action')
                        .setDescription('Enable or disable the command')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Enable', value: 'enable' },
                            { name: 'Disable', value: 'disable' }
                        )
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .setDMPermission(false)
        );
    }

    public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
        const focusedValue = interaction.options.getFocused();
        
        // Get all command names
        const commands = this.container.stores.get('commands');
        const commandNames = Array.from(commands.values())
            .filter(cmd => {
                // Don't allow disabling critical commands
                const criticalCommands = ['settings', 'togglecommand', 'configmodule', 'help'];
                return !criticalCommands.includes(cmd.name);
            })
            .map(cmd => cmd.name)
            .filter(name => name.toLowerCase().includes(focusedValue.toLowerCase()))
            .slice(0, 25); // Discord limit

        await interaction.respond(
            commandNames.map(name => ({ name, value: name }))
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guild) {
            return interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
        }

        const commandName = interaction.options.getString('command', true).toLowerCase();
        const action = interaction.options.getString('action', true);

        try {
            // Check if command exists
            const command = this.container.stores.get('commands').get(commandName);
            if (!command) {
                return interaction.reply({ 
                    content: `❌ Command \`${commandName}\` not found.`, 
                    ephemeral: true 
                });
            }

            // Prevent disabling critical commands
            const criticalCommands = ['settings', 'togglecommand', 'configmodule', 'help'];
            if (criticalCommands.includes(commandName)) {
                return interaction.reply({ 
                    content: `❌ Cannot disable critical command \`${commandName}\`.`, 
                    ephemeral: true 
                });
            }

            let guildData = await Guild.findOne({ guildId: interaction.guild.id });
            
            if (!guildData) {
                guildData = new Guild({
                    guildId: interaction.guild.id
                });
            }

            if (!guildData.disabledCommands) {
                guildData.disabledCommands = [];
            }

            const isDisabled = guildData.disabledCommands.includes(commandName);

            if (action === 'disable') {
                if (isDisabled) {
                    return interaction.reply({ 
                        content: `❌ Command \`${commandName}\` is already disabled.`, 
                        ephemeral: true 
                    });
                }

                guildData.disabledCommands.push(commandName);
                await guildData.save();

                const embed = new EmbedBuilder()
                    .setColor('#db2b1f')
                    .setTitle('🔴 Command Disabled')
                    .setDescription(`Command \`${commandName}\` has been disabled for this server.`)
                    .addFields({
                        name: 'Note',
                        value: 'Users will no longer be able to use this command. To re-enable it, use `/togglecommand` again.',
                        inline: false
                    })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            } else {
                // Enable
                if (!isDisabled) {
                    return interaction.reply({ 
                        content: `❌ Command \`${commandName}\` is not disabled.`, 
                        ephemeral: true 
                    });
                }

                guildData.disabledCommands = guildData.disabledCommands.filter(cmd => cmd !== commandName);
                await guildData.save();

                const embed = new EmbedBuilder()
                    .setColor('#49e358')
                    .setTitle('✅ Command Enabled')
                    .setDescription(`Command \`${commandName}\` has been enabled for this server.`)
                    .addFields({
                        name: 'Note',
                        value: 'Users can now use this command again.',
                        inline: false
                    })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error toggling command:', error);
            return interaction.reply({ 
                content: '❌ An error occurred while toggling the command.', 
                ephemeral: true 
            });
        }
    }
}
