import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ReactionRolesModule } from '../../../modules/ReactionRoles';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
    ActionRowBuilder,
    ChannelType,
    ColorResolvable,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextChannel
} from 'discord.js';
import { type ReactionRole } from '../../../models/Guild';
import { Guild } from '../../../models/Guild';
import config from '../../../config';
import { ErrorHandler } from '../../../lib/structures/ErrorHandler';
import { parseReactionRoleEmoji, updateReactionRoleMenuMessage } from '../../../lib/utils/reactionRolesHelpers';
import { handleCreate } from './create';
import { handleList } from './list';
import { handleDelete } from './delete';
import { handlePause, handleResume } from './pause';
import { handleEdit } from './edit';
import { respondWithMenuIdChoices, respondWithMenuRoleChoices, hasRequiredPermissions } from './utils';

@ApplyOptions<Command.Options>({
    name: 'reactionroles',
    description: 'Manage reaction roles',
    preconditions: ['GuildOnly']
})
export class ReactionRolesCommand extends ModuleCommand<ReactionRolesModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'ReactionRoles',
            description: 'Manage reaction roles in your server',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('reactionroles')
                .setDescription('Manage role selection menus')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('create')
                        .setDescription('Create a new role selection menu')
                        .addChannelOption((option) =>
                            option
                                .setName('channel')
                                .setDescription('The channel to send the menu to')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('title')
                                .setDescription('Title for the embed')
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('description')
                                .setDescription('Description text for the embed')
                                .setRequired(true)
                        )
                        .addRoleOption((option) =>
                            option
                                .setName('role1')
                                .setDescription('First role to add')
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('label1')
                                .setDescription('Label for the first role')
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('emoji1')
                                .setDescription('Emoji for the first role (Unicode or Discord emoji ID)')
                                .setRequired(false)
                        )
                        .addRoleOption((option) =>
                            option
                                .setName('role2')
                                .setDescription('Second role to add')
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('label2')
                                .setDescription('Label for the second role')
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('emoji2')
                                .setDescription('Emoji for the second role (Unicode or Discord emoji ID)')
                                .setRequired(false)
                        )
                        .addRoleOption((option) =>
                            option
                                .setName('role3')
                                .setDescription('Third role to add')
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('label3')
                                .setDescription('Label for the third role')
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('emoji3')
                                .setDescription('Emoji for the third role (Unicode or Discord emoji ID)')
                                .setRequired(false)
                        )
                        .addRoleOption((option) =>
                            option
                                .setName('role4')
                                .setDescription('Fourth role to add')
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('label4')
                                .setDescription('Label for the fourth role')
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('emoji4')
                                .setDescription('Emoji for the fourth role (Unicode or Discord emoji ID)')
                                .setRequired(false)
                        )
                        .addRoleOption((option) =>
                            option
                                .setName('role5')
                                .setDescription('Fifth role to add')
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('label5')
                                .setDescription('Label for the fifth role')
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('emoji5')
                                .setDescription('Emoji for the fifth role (Unicode or Discord emoji ID)')
                                .setRequired(false)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('max_selections')
                                .setDescription('Maximum number of roles a user can select (0 for unlimited)')
                                .setRequired(false)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('list')
                        .setDescription('List all reaction roles menus in this server')
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('delete')
                        .setDescription('Delete a reaction roles menu')
                        .addStringOption((option) =>
                            option
                                .setName('menu_id')
                                .setDescription('ID of the menu to delete')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('pause')
                        .setDescription('Pause a reaction roles menu')
                        .addStringOption((option) =>
                            option
                                .setName('menu_id')
                                .setDescription('ID of the menu to pause (all for all menus)')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('resume')
                        .setDescription('Resume a paused reaction roles menu')
                        .addStringOption((option) =>
                            option
                                .setName('menu_id')
                                .setDescription('ID of the menu to resume (all for all menus)')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('edit')
                        .setDescription('Edit an existing role selection menu')
                        .addStringOption((option) =>
                            option
                                .setName('menu_id')
                                .setDescription('ID of the menu to edit')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('title')
                                .setDescription('New title for the embed (leave empty to keep current)')
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('description')
                                .setDescription('New description for the embed (leave empty to keep current)')
                                .setRequired(false)
                        )
                        .addRoleOption((option) =>
                            option
                                .setName('add_role')
                                .setDescription('Role to add to the menu')
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('add_label')
                                .setDescription('Label for the role to add')
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('add_emoji')
                                .setDescription('Emoji for the role to add (Unicode or Discord emoji ID)')
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('remove_roles')
                                .setDescription('Role IDs to remove (comma-separated)')
                                .setRequired(false)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('max_selections')
                                .setDescription('New maximum number of roles a user can select (0 for unlimited)')
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('update_emoji_role')
                                .setDescription('Role ID to update emoji for')
                                .setRequired(false)
                                .setAutocomplete(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('update_emoji')
                                .setDescription('New emoji for the selected role (Unicode or Discord emoji ID)')
                                .setRequired(false)
                        )
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        if (!await hasRequiredPermissions(interaction)) {
            return ErrorHandler.sendPermissionError(interaction, 'Administrator');
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                await handleCreate(interaction);
                break;
            case 'list':
                await handleList(interaction);
                break;
            case 'delete':
                await handleDelete(interaction);
                break;
            case 'pause':
                await handlePause(interaction);
                break;
            case 'resume':
                await handleResume(interaction);
                break;
            case 'edit':
                await handleEdit(interaction);
                break;
            default:
                await interaction.reply({
                    content: 'Invalid subcommand.',
                    flags: MessageFlags.Ephemeral
                });
        }

        return;
    }

    public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
        if (interaction.commandName !== 'reactionroles') {
            return interaction.respond([]);
        }

        const subcommand = interaction.options.getSubcommand();
        const focusedOption = interaction.options.getFocused(true);

        if (focusedOption.name === 'menu_id' && ['delete', 'pause', 'resume', 'edit'].includes(subcommand)) {
            return respondWithMenuIdChoices(interaction, ['pause', 'resume'].includes(subcommand));
        }

        if (subcommand === 'edit' && focusedOption.name === 'remove_roles') {
            return respondWithMenuRoleChoices(interaction, false);
        }

        if (subcommand === 'edit' && focusedOption.name === 'update_emoji_role') {
            return respondWithMenuRoleChoices(interaction, true);
        }

        return interaction.respond([]);
    }
}
