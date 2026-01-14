import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, EmbedBuilder, GuildMember, Role } from 'discord.js';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';

@ApplyOptions<Command.Options>({
    name: 'addrole',
    description: 'Add a role to a user',
    aliases: ['giverole', 'addr', 'ar'],
    preconditions: ['GuildOnly', 'ModeratorOnly']
})
export class AddRoleCommand extends ModuleCommand<ModerationModule> {
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
                        .setDescription('The user to add the role to')
                        .setRequired(true)
                )
                .addRoleOption((option) =>
                    option
                        .setName('role')
                        .setDescription('The role to add')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('reason')
                        .setDescription('Reason for adding the role')
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

            // Check if bot's highest role is higher than the role to add
            if (botMember.roles.highest.position <= role.position) {
                return interaction.reply({ 
                    content: '❌ I cannot add this role because it is higher than or equal to my highest role.', 
                    ephemeral: true 
                });
            }

            // Check if executor's highest role is higher than the role to add
            if (executorMember.roles.highest.position <= role.position) {
                return interaction.reply({ 
                    content: '❌ You cannot add this role because it is higher than or equal to your highest role.', 
                    ephemeral: true 
                });
            }

            // Check if member already has the role
            if (member.roles.cache.has(role.id)) {
                return interaction.reply({ 
                    content: `❌ ${targetUser.tag} already has the ${role.name} role.`, 
                    ephemeral: true 
                });
            }

            // Add the role
            await member.roles.add(role, `Added by ${interaction.user.tag}: ${reason}`);

            const embed = new EmbedBuilder()
                .setColor('#49e358')
                .setTitle('✅ Role Added')
                .setDescription(`Successfully added ${role} to ${targetUser}`)
                .addFields(
                    { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: 'Role', value: `${role.name} (${role.id})`, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error adding role:', error);
            return interaction.reply({ 
                content: '❌ An error occurred while adding the role.', 
                ephemeral: true 
            });
        }
    }
}
