import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, EmbedBuilder, GuildMember, Role } from 'discord.js';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';

@ApplyOptions<Command.Options>({
    name: 'removerole',
    description: 'Remove a role from a user',
    aliases: ['remover', 'rr'],
    preconditions: ['GuildOnly', 'ModeratorOnly']
})
export class RemoveRoleCommand extends ModuleCommand<ModerationModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Moderation'
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption((option) =>
                    option
                        .setName('user')
                        .setDescription('The user to remove the role from')
                        .setRequired(true)
                )
                .addRoleOption((option) =>
                    option
                        .setName('role')
                        .setDescription('The role to remove')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('reason')
                        .setDescription('Reason for removing the role')
                        .setRequired(false)
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
                .setDMPermission(false)
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guild) {
            return interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user', true);
        const role = interaction.options.getRole('role', true) as Role;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            const member = await interaction.guild.members.fetch(targetUser.id);
            const botMember = await interaction.guild.members.fetch(interaction.client.user!.id);
            const executorMember = interaction.member as GuildMember;

            // Permission checks
            if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return interaction.reply({ 
                    content: '❌ I don\'t have permission to manage roles.', 
                    ephemeral: true 
                });
            }

            if (!executorMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return interaction.reply({ 
                    content: '❌ You don\'t have permission to manage roles.', 
                    ephemeral: true 
                });
            }

            // Check if bot's highest role is higher than the role to remove
            if (botMember.roles.highest.position <= role.position) {
                return interaction.reply({ 
                    content: '❌ I cannot remove this role because it is higher than or equal to my highest role.', 
                    ephemeral: true 
                });
            }

            // Check if executor's highest role is higher than the role to remove
            if (executorMember.roles.highest.position <= role.position) {
                return interaction.reply({ 
                    content: '❌ You cannot remove this role because it is higher than or equal to your highest role.', 
                    ephemeral: true 
                });
            }

            // Check if member has the role
            if (!member.roles.cache.has(role.id)) {
                return interaction.reply({ 
                    content: `❌ ${targetUser.tag} doesn't have the ${role.name} role.`, 
                    ephemeral: true 
                });
            }

            // Remove the role
            await member.roles.remove(role, `Removed by ${interaction.user.tag}: ${reason}`);

            const embed = new EmbedBuilder()
                .setColor('#49e358')
                .setTitle('✅ Role Removed')
                .setDescription(`Successfully removed ${role} from ${targetUser}`)
                .addFields(
                    { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: 'Role', value: `${role.name} (${role.id})`, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error removing role:', error);
            return interaction.reply({ 
                content: '❌ An error occurred while removing the role.', 
                ephemeral: true 
            });
        }
    }
}
