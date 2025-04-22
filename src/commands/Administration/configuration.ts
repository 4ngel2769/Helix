import { ModuleCommand } from '@kbotdev/plugin-modules';
import { AdministrationModule } from '../../modules/Administration';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { 
    PermissionFlagsBits, 
    EmbedBuilder,
    ColorResolvable,
    MessageFlags
} from 'discord.js';
import { Guild } from '../../models/Guild';
import { ErrorHandler } from '../../lib/structures/ErrorHandler';
import config from '../../config';

@ApplyOptions<Command.Options>({
    name: 'config',
    description: 'Configure server settings',
    preconditions: ['GuildOnly']
})
export class ConfigCommand extends ModuleCommand<AdministrationModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Administration',
            description: 'Configure server settings',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('config')
                .setDescription('Configure server settings')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('admin_role')
                        .setDescription('Set the administrator role')
                        .addRoleOption((option) =>
                            option
                                .setName('role')
                                .setDescription('The role to set as administrator')
                                .setRequired(true)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('mod_role')
                        .setDescription('Set the moderator role')
                        .addRoleOption((option) =>
                            option
                                .setName('role')
                                .setDescription('The role to set as moderator')
                                .setRequired(true)
                        )
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        // Check if user has required permissions
        const member = interaction.member;
        const isOwner = interaction.guild?.ownerId === member?.user.id;
        
        if (!isOwner && !this.hasAdminPermissions(member)) {
            return ErrorHandler.sendPermissionError(interaction, 'Administrator');
        }

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId!;
        let guildData = await Guild.findOne({ guildId });

        if (!guildData) {
            guildData = new Guild({ guildId });
        }

        switch (subcommand) {
            case 'admin_role': {
                // Only owner can set admin role
                if (!isOwner) {
                    return ErrorHandler.sendCommandError(
                        interaction,
                        'Only the server owner can set the administrator role.'
                    );
                }

                const role = interaction.options.getRole('role', true);
                guildData.adminRoleId = role.id;
                await guildData.save();

                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.success as ColorResolvable)
                    .setTitle('✅ Administrator Role Set')
                    .setDescription(`Administrator role has been set to ${role}`)
                    .setFooter({ text: 'Users with this role will have access to administrative commands.' });

                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            case 'mod_role': {
                const role = interaction.options.getRole('role', true);
                guildData.modRoleId = role.id;
                await guildData.save();

                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.success as ColorResolvable)
                    .setTitle('✅ Moderator Role Set')
                    .setDescription(`Moderator role has been set to ${role}`)
                    .setFooter({ text: 'Users with this role will have access to moderation commands.' });

                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            default:
                return ErrorHandler.sendCommandError(
                    interaction,
                    'Invalid subcommand.'
                );
        }
    }

    private hasAdminPermissions(member: any) {
        return member.permissions.has([
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageRoles,
            PermissionFlagsBits.BanMembers,
            PermissionFlagsBits.KickMembers,
            PermissionFlagsBits.ModerateMembers
        ]);
    }
} 