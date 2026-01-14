import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, EmbedBuilder, Role } from 'discord.js';
import { Guild } from '../../models/Guild';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import { AdministrationModule } from '../../modules/Administration';

@ApplyOptions<Command.Options>({
    name: 'setmuterole',
    description: 'Set the mute role for your server',
    aliases: ['setmute'],
    preconditions: ['GuildOnly']
})
export class SetMuteRoleCommand extends ModuleCommand<AdministrationModule> {
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
                .addRoleOption((option) =>
                    option
                        .setName('role')
                        .setDescription('The mute role (leave empty to clear)')
                        .setRequired(false)
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .setDMPermission(false)
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guild) {
            return interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
        }

        const role = interaction.options.getRole('role') as Role | null;

        try {
            let guildData = await Guild.findOne({ guildId: interaction.guild.id });
            
            if (!guildData) {
                guildData = new Guild({
                    guildId: interaction.guild.id
                });
            }

            if (!role) {
                // Clear mute role
                guildData.muteRoleId = null;
                await guildData.save();

                const embed = new EmbedBuilder()
                    .setColor('#49e358')
                    .setTitle('✅ Mute Role Cleared')
                    .setDescription('The mute role has been cleared from your server settings.')
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            // Set mute role
            guildData.muteRoleId = role.id;
            await guildData.save();

            const embed = new EmbedBuilder()
                .setColor('#49e358')
                .setTitle('✅ Mute Role Set')
                .setDescription(`Mute role has been set to ${role}`)
                .addFields(
                    {
                        name: 'Role',
                        value: `${role.name} (${role.id})`,
                        inline: true
                    },
                    {
                        name: 'ℹ️ Note',
                        value: 'Make sure this role has the necessary permissions to restrict users from sending messages.',
                        inline: false
                    }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error setting mute role:', error);
            return interaction.reply({ 
                content: '❌ An error occurred while setting the mute role.', 
                ephemeral: true 
            });
        }
    }
}
