import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, EmbedBuilder, Role, MessageFlags } from 'discord.js';
import { Guild } from '../../models/Guild';
import { clearGuildAutomation } from '../../lib/utils/guildAutomationCache';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import { AdministrationModule } from '../../modules/Administration';

import { HybridModuleCommand } from '../../lib/structures/HybridCommand';

@ApplyOptions<Command.Options>({
    name: 'setmodrole',
    description: 'Set the moderator role for your server',
    aliases: ['setmr', 'smr'],
    preconditions: ['GuildOnly'],
    requiredUserPermissions: ['ManageGuild'],
    requiredClientPermissions: ['ManageGuild'],
})
export class SetModRoleCommand extends HybridModuleCommand<AdministrationModule> {
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
            return interaction.reply({ content: 'âŒ This command can only be used in a server.', flags: MessageFlags.Ephemeral });
        }

        const role = interaction.options.getRole('role') as Role | null;
        if (role && (role.id === interaction.guild.roles.everyone.id || role.managed)) {
            return interaction.reply({ content: 'The @everyone and managed integration roles cannot be assigned here.', flags: MessageFlags.Ephemeral });
        }

        try {
            let guildData = await Guild.findOne({ guildId: interaction.guild.id });
            
            if (!guildData) {
                guildData = new Guild({
                    guildId: interaction.guild.id
                });
            }

            if (!role) {
                // Clear mod role
                guildData.modRoleId = undefined;
                await guildData.save();
                clearGuildAutomation(interaction.guild.id);

                const embed = new EmbedBuilder()
                    .setColor('#49e358')
                    .setTitle('âœ… Moderator Role Cleared')
                    .setDescription('The moderator role has been cleared from your server settings.')
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            // Set mod role
            guildData.modRoleId = role.id;
            await guildData.save();
            clearGuildAutomation(interaction.guild.id);

            const embed = new EmbedBuilder()
                .setColor('#49e358')
                .setTitle('âœ… Moderator Role Set')
                .setDescription(`Moderator role has been set to ${role}`)
                .addFields({
                    name: 'Role',
                    value: `${role.name} (${role.id})`,
                    inline: true
                })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            this.container.logger.error('Error setting mod role:', error);
            return interaction.reply({ 
                content: 'âŒ An error occurred while setting the moderator role.', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
}
