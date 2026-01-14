import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, EmbedBuilder, Role } from 'discord.js';
import { Guild } from '../../models/Guild';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import { AdministrationModule } from '../../modules/Administration';

@ApplyOptions<Command.Options>({
    name: 'setmodrole',
    description: 'Set the moderator role for your server',
    aliases: ['setmr', 'smr'],
    preconditions: ['GuildOnly']
})
export class SetModRoleCommand extends ModuleCommand<AdministrationModule> {
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
                        .setDescription('The moderator role (leave empty to clear)')
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
                // Clear mod role
                guildData.modRoleId = null;
                await guildData.save();

                const embed = new EmbedBuilder()
                    .setColor('#49e358')
                    .setTitle('✅ Moderator Role Cleared')
                    .setDescription('The moderator role has been cleared from your server settings.')
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            // Set mod role
            guildData.modRoleId = role.id;
            await guildData.save();

            const embed = new EmbedBuilder()
                .setColor('#49e358')
                .setTitle('✅ Moderator Role Set')
                .setDescription(`Moderator role has been set to ${role}`)
                .addFields({
                    name: 'Role',
                    value: `${role.name} (${role.id})`,
                    inline: true
                })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error setting mod role:', error);
            return interaction.reply({ 
                content: '❌ An error occurred while setting the moderator role.', 
                ephemeral: true 
            });
        }
    }
}
