import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ReactionRolesModule } from '../../modules/ReactionRoles';
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
import { Guild, type ReactionRole, type ReactionRolesMenu } from '../../models/Guild';
import config from '../../config';
import { ErrorHandler } from '../../lib/structures/ErrorHandler';
import { parseReactionRoleEmoji, updateReactionRoleMenuMessage } from '../../lib/utils/reactionRolesHelpers';

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

    // Command handler
    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        // Check permissions
        if (!await this.hasRequiredPermissions(interaction)) {
            return ErrorHandler.sendPermissionError(interaction, 'Administrator');
        }
        
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'create':
                await this.handleCreate(interaction);
                break;
            case 'list':
                await this.handleList(interaction);
                break;
            case 'delete':
                await this.handleDelete(interaction);
                break;
            case 'pause':
                await this.handlePause(interaction);
                break;
            case 'resume':
                await this.handleResume(interaction);
                break;
            case 'edit':
                await this.handleEdit(interaction);
                break;
            default:
                await interaction.reply({
                    content: 'Invalid subcommand.',
                    flags: MessageFlags.Ephemeral
                });
        }
    }
    
    // For autocomplete on menu IDs
    public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
        if (interaction.commandName !== 'reactionroles') {
            return interaction.respond([]);
        }

        const subcommand = interaction.options.getSubcommand();
        const focusedOption = interaction.options.getFocused(true);

        if (focusedOption.name === 'menu_id' && ['delete', 'pause', 'resume', 'edit'].includes(subcommand)) {
            return this.respondWithMenuIdChoices(interaction, ['pause', 'resume'].includes(subcommand));
        }

        if (subcommand === 'edit' && focusedOption.name === 'remove_roles') {
            return this.respondWithMenuRoleChoices(interaction, false);
        }

        if (subcommand === 'edit' && focusedOption.name === 'update_emoji_role') {
            return this.respondWithMenuRoleChoices(interaction, true);
        }

        return interaction.respond([]);
    }

    private async respondWithMenuIdChoices(
        interaction: Command.AutocompleteInteraction,
        includeAllOption: boolean
    ) {
        try {
            const guildId = interaction.guildId!;
            const guildData = await Guild.findOne({ guildId });

            if (!guildData || !guildData.reactionRolesMenus?.length) {
                return interaction.respond([]);
            }

            const allChoice = includeAllOption ? [{ name: 'All menus', value: 'all' }] : [];
            const menuChoices = guildData.reactionRolesMenus.map((menu) => ({
                name: `${menu.title} (${menu.messageId})`,
                value: menu.messageId
            }));

            return interaction.respond([...allChoice, ...menuChoices]);
        } catch (error) {
            console.error('Error in menu_id autocomplete:', error);
            return interaction.respond([]);
        }
    }

    private async respondWithMenuRoleChoices(
        interaction: Command.AutocompleteInteraction,
        includeEmojiStatus: boolean
    ) {
        try {
            const menuId = interaction.options.getString('menu_id');
            if (!menuId) {
                return interaction.respond([{ name: 'Please select a menu ID first', value: '' }]);
            }

            const guildId = interaction.guildId!;
            const guildData = await Guild.findOne({
                guildId,
                'reactionRolesMenus.messageId': menuId
            });

            const menu = guildData?.reactionRolesMenus?.find((entry) => entry.messageId === menuId);
            if (!menu || !menu.roles.length) {
                return interaction.respond([]);
            }

            const choices = menu.roles.map((roleData) => {
                const role = interaction.guild?.roles.cache.get(roleData.roleId);
                const roleName = role ? role.name : 'Unknown Role';
                const emojiPrefix = includeEmojiStatus ? `${roleData.emoji ? '✓' : '✗'} ` : '';

                return {
                    name: `${emojiPrefix}${roleData.label} (${roleName})`,
                    value: roleData.roleId
                };
            });

            return interaction.respond(choices);
        } catch (error) {
            console.error('Error in role autocomplete:', error);
            return interaction.respond([]);
        }
    }

    private async handleCreate(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const channel = interaction.options.getChannel('channel', true) as TextChannel;
        const title = interaction.options.getString('title', true);
        const description = interaction.options.getString('description', true);
        const maxSelections = interaction.options.getInteger('max_selections') ?? 0;
        
        // Check bot permissions in the target channel
        const hasPermissions = await ErrorHandler.checkPermissions(channel, [
            'SendMessages',
            'ViewChannel',
            'EmbedLinks'
        ]);

        if (!hasPermissions) {
            return interaction.editReply('I need permission to send messages and embeds in the target channel.');
        }
        
        // Check if bot can manage roles
        const botMember = interaction.guild?.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.editReply('I need the Manage Roles permission to create reaction roles.');
        }
        
        // Collect roles
        const roles: ReactionRole[] = [];
        for (let i = 1; i <= 5; i++) {
            const role = interaction.options.getRole(`role${i}`);
            const label = interaction.options.getString(`label${i}`);
            const emojiInput = interaction.options.getString(`emoji${i}`);
            
            if (role && label) {
                // Check if the role is manageable
                if (role.managed) {
                    return interaction.editReply(`The role "${role.name}" is managed by an integration and cannot be assigned by me.`);
                }
                
                // Check if bot's role is higher than the role it's trying to assign
                const guildRole = interaction.guild?.roles.cache.get(role.id);
                if (guildRole && botMember.roles.highest.comparePositionTo(guildRole) <= 0) {
                    return interaction.editReply(`My highest role must be above the "${role.name}" role in the server settings.`);
                }
                
                // Parse emoji if provided
                const emoji = parseReactionRoleEmoji(emojiInput);
                
                roles.push({
                    roleId: role.id,
                    label: label,
                    description: '', // Could be added as option later
                    emoji: emoji // Use the parsed emoji
                });
            }
        }
        
        if (roles.length === 0) {
            return interaction.editReply('You need to provide at least one role and label.');
        }
        
        try {
            // Send the message
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle(title)
                .setDescription(description)
                .setFooter({ text: `Select roles from the dropdown menu below` });
            
            // Create select menu options
            const options = roles.map(role => {
                const option = new StringSelectMenuOptionBuilder()
                    .setLabel(role.label)
                    .setValue(role.roleId)
                    .setDescription(`Get the ${interaction.guild?.roles.cache.get(role.roleId)?.name || 'Unknown'} role`);
                
                // Add emoji if available
                if (role.emoji) {
                    // Check if it's a Discord custom emoji (<:name:id> or <a:name:id>)
                    const discordEmojiRegex = /<(a)?:(\w+):(\d+)>/;
                    const match = role.emoji.match(discordEmojiRegex);
                    
                    if (match) {
                        // Discord custom emoji
                        const name = match[2];
                        const id = match[3];
                        option.setEmoji({ name, id });
                    } else {
                        // Unicode emoji
                        option.setEmoji({ name: role.emoji });
                    }
                }
                
                return option;
            });
            
            // Create the select menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('reaction-roles-select')
                .setPlaceholder('Select roles...')
                .addOptions(options)
                .setDisabled(false) // New menus are active by default
                .setMinValues(0)
                .setMaxValues(maxSelections > 0 ? Math.min(maxSelections, roles.length) : roles.length);
            
            const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(selectMenu);
            
            // Send the message
            const sentMessage = await channel.send({
                embeds: [embed],
                components: [row]
            });
            
            // Save to database
            const guildId = interaction.guildId!;
            await Guild.updateOne(
                { guildId },
                { 
                    $push: { 
                        reactionRolesMenus: {
                            messageId: sentMessage.id,
                            channelId: channel.id,
                            title,
                            description,
                            roles,
                            maxSelections,
                            active: true,
                            createdBy: interaction.user.id,
                            createdAt: new Date()
                        }
                    }
                },
                { upsert: true }
            );
            
            // Confirm to user
            return interaction.editReply(`Successfully created role selection menu in ${channel}.`);
            
        } catch (error) {
            console.error('Error creating reaction roles menu:', error);
            return interaction.editReply('An error occurred while creating the roles menu.');
        }
    }

    private async handleList(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const guildId = interaction.guildId!;
        const guildData = await Guild.findOne({ guildId });
        
        if (!guildData || !guildData.reactionRolesMenus?.length) {
            return interaction.editReply('No reaction roles menus found in this server.');
        }
        
        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default as ColorResolvable)
            .setTitle('Reaction Roles Menus')
            .setDescription(`This server has ${guildData.reactionRolesMenus.length} reaction roles menus.`)
            .setFooter({ text: `Requested by ${interaction.user.tag}` });
        
        for (const menu of guildData.reactionRolesMenus) {
            const channel = interaction.guild?.channels.cache.get(menu.channelId);
            const roles = menu.roles.map(role => {
                const roleObj = interaction.guild?.roles.cache.get(role.roleId);
                return roleObj 
                    ? `<@&${role.roleId}> (${role.label})` 
                    : `Unknown Role: ${role.label}`;
            }).join('\n');
            
            embed.addFields({
                name: `${menu.active ? '✅' : '❌'} ${menu.title} (${menu.messageId})`,
                value: `**Channel:** ${channel ? `<#${channel.id}>` : 'Unknown'}\n**Roles:** \n${roles}\n**Max Selections:** ${menu.maxSelections > 0 ? menu.maxSelections : 'Unlimited'}`,
                inline: false
            });
        }
        
        return interaction.editReply({ embeds: [embed] });
    }

    private async handleDelete(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const messageId = interaction.options.getString('menu_id', true);
        const guildId = interaction.guildId!;
        
        // Find the menu
        const guildData = await Guild.findOne({ guildId, 'reactionRolesMenus.messageId': messageId });
        
        if (!guildData) {
            return interaction.editReply('Reaction roles menu not found.');
        }
        
        const menu = guildData.reactionRolesMenus?.find(m => m.messageId === messageId);
        
        if (!menu) {
            return interaction.editReply('Reaction roles menu not found.');
        }
        
        try {
            // Try to delete the message
            try {
                const channel = await interaction.guild?.channels.fetch(menu.channelId) as TextChannel;
                if (channel) {
                    const message = await channel.messages.fetch(menu.messageId);
                    if (message) {
                        await message.delete();
                    }
                }
            } catch (error) {
                console.log('Could not delete message, it might have been deleted already.');
            }
            
            // Remove from database
            await Guild.updateOne(
                { guildId },
                { $pull: { reactionRolesMenus: { messageId } } }
            );
            
            return interaction.editReply(`Successfully deleted reaction roles menu "${menu.title}".`);
            
        } catch (error) {
            console.error('Error deleting reaction roles menu:', error);
            return interaction.editReply('An error occurred while deleting the reaction roles menu.');
        }
    }

    private async handlePause(interaction: Command.ChatInputCommandInteraction) {
        return this.toggleMenuState(interaction, false);
    }

    private async handleResume(interaction: Command.ChatInputCommandInteraction) {
        return this.toggleMenuState(interaction, true);
    }

    private async toggleMenuState(
        interaction: Command.ChatInputCommandInteraction,
        makeActive: boolean
    ) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const menuId = interaction.options.getString('menu_id', true);
        const guildId = interaction.guildId!;

        try {
            if (menuId === 'all') {
                const guildData = await Guild.findOne({ guildId });

                if (!guildData || !guildData.reactionRolesMenus?.length) {
                    return interaction.editReply('No reaction roles menus found in this server.');
                }

                const menusToToggle = guildData.reactionRolesMenus.filter((menu) => menu.active !== makeActive);
                if (menusToToggle.length === 0) {
                    return interaction.editReply(
                        makeActive ? 'All menus are already active.' : 'All menus are already paused.'
                    );
                }

                const { updatedCount, failedCount } = await this.syncMenuMessageStates(
                    interaction,
                    menusToToggle,
                    makeActive
                );

                await Guild.updateMany(
                    { guildId, 'reactionRolesMenus.active': !makeActive },
                    { $set: { 'reactionRolesMenus.$[].active': makeActive } }
                );

                let response = `Successfully ${makeActive ? 'resumed' : 'paused'} all reaction roles menus in the database.`;
                if (updatedCount > 0) {
                    response += `\nUpdated ${updatedCount} menu message${updatedCount !== 1 ? 's' : ''}.`;
                }
                if (failedCount > 0) {
                    response += `\n${failedCount} menu message${failedCount !== 1 ? 's' : ''} could not be updated (may have been deleted).`;
                }

                return interaction.editReply(response);
            }

            const guildData = await Guild.findOne({ guildId, 'reactionRolesMenus.messageId': menuId });
            if (!guildData) {
                return interaction.editReply('Reaction roles menu not found.');
            }

            const menu = guildData.reactionRolesMenus?.find((entry) => entry.messageId === menuId);
            if (!menu) {
                return interaction.editReply('Reaction roles menu not found.');
            }

            if (menu.active === makeActive) {
                return interaction.editReply(
                    makeActive ? 'This menu is already active.' : 'This menu is already paused.'
                );
            }

            const updated = await this.updateMenuMessageState(interaction, menu, makeActive);

            await Guild.updateOne(
                { guildId, 'reactionRolesMenus.messageId': menuId },
                { $set: { 'reactionRolesMenus.$.active': makeActive } }
            );

            let response = `Successfully ${makeActive ? 'resumed' : 'paused'} reaction roles menu "${menu.title}" in the database.`;
            if (updated) {
                response += makeActive
                    ? '\nThe menu message has been updated and is now interactive.'
                    : '\nThe menu message has been updated to reflect its paused state.';
            } else {
                response += '\nThe menu message could not be updated (it may have been deleted).';
            }

            return interaction.editReply(response);
        } catch (error) {
            console.error(
                `Error ${makeActive ? 'resuming' : 'pausing'} reaction roles menu:`,
                error
            );
            return interaction.editReply(
                `An error occurred while ${makeActive ? 'resuming' : 'pausing'} the reaction roles menu.`
            );
        }
    }

    private async syncMenuMessageStates(
        interaction: Command.ChatInputCommandInteraction,
        menus: ReactionRolesMenu[],
        isActive: boolean
    ): Promise<{ updatedCount: number; failedCount: number }> {
        let updatedCount = 0;
        let failedCount = 0;

        for (const menu of menus) {
            const updated = await this.updateMenuMessageState(interaction, menu, isActive);
            if (updated) {
                updatedCount++;
                continue;
            }

            failedCount++;
        }

        return { updatedCount, failedCount };
    }

    private async updateMenuMessageState(
        interaction: Command.ChatInputCommandInteraction,
        menu: ReactionRolesMenu,
        isActive: boolean
    ): Promise<boolean> {
        return updateReactionRoleMenuMessage({
            interaction,
            channelId: menu.channelId,
            messageId: menu.messageId,
            title: menu.title,
            description: menu.description,
            roles: menu.roles,
            maxSelections: menu.maxSelections,
            isActive
        });
    }

    private async handleEdit(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const messageId = interaction.options.getString('menu_id', true);
        const newTitle = interaction.options.getString('title');
        const newDescription = interaction.options.getString('description');
        const addRole = interaction.options.getRole('add_role');
        const addLabel = interaction.options.getString('add_label');
        const addEmoji = interaction.options.getString('add_emoji');
        const removeRolesInput = interaction.options.getString('remove_roles');
        const newMaxSelections = interaction.options.getInteger('max_selections');
        
        const guildId = interaction.guildId!;
        
        try {
            // Find the menu
            const guildData = await Guild.findOne({ guildId, 'reactionRolesMenus.messageId': messageId });
            
            if (!guildData) {
                return interaction.editReply('Reaction roles menu not found.');
            }
            
            // Find the menu in the array
            const menuIndex = guildData.reactionRolesMenus?.findIndex(m => m.messageId === messageId);
            
            if (menuIndex === undefined || menuIndex === -1 || !guildData.reactionRolesMenus) {
                return interaction.editReply('Reaction roles menu not found.');
            }
            
            // Get the current menu
            const menu = guildData.reactionRolesMenus[menuIndex];
            
            // Create an update object with only the fields we want to change
            const updateData: Record<string, string | number | ReactionRole[]> = {};
            const changes: string[] = [];
            
            // For role changes, we need to get the current roles first
            let updatedRoles: ReactionRole[] = [...menu.roles];
            let rolesChanged = false;
            
            // Update title if provided
            if (newTitle) {
                updateData['reactionRolesMenus.$.title'] = newTitle;
                changes.push(`> title: \`${menu.title}\` -> \`${newTitle}\``);
            }
            
            // Update description if provided
            if (newDescription) {
                updateData['reactionRolesMenus.$.description'] = newDescription;
                changes.push(`> description: \`${menu.description.substring(0, 30)}${menu.description.length > 30 ? '...' : ''}\` -> \`${newDescription.substring(0, 30)}${newDescription.length > 30 ? '...' : ''}\``);
            }
            
            // Update max selections if provided
            if (newMaxSelections !== null && newMaxSelections !== undefined) {
                updateData['reactionRolesMenus.$.maxSelections'] = newMaxSelections;
                changes.push(`> max selections: \`${menu.maxSelections > 0 ? menu.maxSelections : 'Unlimited'}\` -> \`${newMaxSelections > 0 ? newMaxSelections : 'Unlimited'}\``);
            }
            
            // For role changes
            if (addRole && addLabel) {
                // Check if the role is manageable
                const botMember = interaction.guild?.members.me;
                if (!botMember) {
                    return interaction.editReply('An error occurred. Please try again later.');
                }
                
                if (addRole.managed) {
                    return interaction.editReply(`The role "${addRole.name}" is managed by an integration and cannot be assigned by me.`);
                }
                
                // Check if bot's role is higher than the role it's trying to assign
                const guildRole = interaction.guild?.roles.cache.get(addRole.id);
                if (!guildRole || botMember.roles.highest.comparePositionTo(guildRole) <= 0) {
                    return interaction.editReply(`My highest role must be above the "${addRole.name}" role in the server settings.`);
                }
                
                // Check if role already exists in the menu
                if (!updatedRoles.some(r => r.roleId === addRole.id)) {
                    updatedRoles.push({
                        roleId: addRole.id,
                        label: addLabel,
                        description: '',
                        emoji: addEmoji || undefined
                    });
                    rolesChanged = true;
                    changes.push(`> added role: \`${addRole.name}\` (${addLabel})`);
                } else {
                    return interaction.editReply(`Role "${addRole.name}" already exists in this menu.`);
                }
            } else if ((addRole && !addLabel) || (!addRole && addLabel)) {
                return interaction.editReply('Both a role and label are required to add a new role.');
            }
            
            // Get emoji-related options
            const updateEmojiRoleId = interaction.options.getString('update_emoji_role');
            const updateEmoji = interaction.options.getString('update_emoji');
            
            // Process adding emoji with new role
            if (addRole && addLabel) {
                // Parse emoji if provided with new role
                if (addEmoji) {
                    const emoji = parseReactionRoleEmoji(addEmoji);
                    if (emoji) {
                        // Update the last added role with emoji
                        updatedRoles[updatedRoles.length - 1].emoji = emoji;
                    }
                }
            }
            
            // Process updating emoji for existing role
            if (updateEmojiRoleId && updateEmoji) {
                const roleIndex = updatedRoles.findIndex(r => r.roleId === updateEmojiRoleId);
                if (roleIndex === -1) {
                    return interaction.editReply(`Could not find role with ID ${updateEmojiRoleId} in this menu.`);
                }
                
                const emoji = parseReactionRoleEmoji(updateEmoji);
                if (emoji) {
                    updatedRoles[roleIndex].emoji = emoji;
                    rolesChanged = true;
                    
                    const roleName = interaction.guild?.roles.cache.get(updateEmojiRoleId)?.name || 'Unknown';
                    changes.push(`> updated emoji for role: \`${roleName}\` (${updatedRoles[roleIndex].label})`);
                }
            }
            
            // Remove roles if specified
            if (removeRolesInput) {
                const roleIdsToRemove = removeRolesInput.split(',').map(id => id.trim());
                
                if (roleIdsToRemove.length > 0) {
                    const initialRoleCount = updatedRoles.length;
                    updatedRoles = updatedRoles.filter(r => !roleIdsToRemove.includes(r.roleId));
                    
                    if (updatedRoles.length < initialRoleCount) {
                        rolesChanged = true;
                        
                        // Get names of removed roles
                        const removedRoles = roleIdsToRemove.map(roleId => {
                            const roleInfo = menu.roles.find(r => r.roleId === roleId);
                            const roleName = interaction.guild?.roles.cache.get(roleId)?.name || 'Unknown';
                            return roleInfo ? `\`${roleName}\` (${roleInfo.label})` : `\`${roleId}\``;
                        });
                        
                        changes.push(`> removed roles: ${removedRoles.join(', ')}`);
                    }
                    
                    // Ensure at least one role remains
                    if (updatedRoles.length === 0) {
                        return interaction.editReply('Cannot remove all roles. A menu must have at least one role.');
                    }
                }
            }
            
            // Add roles to update if they changed
            if (rolesChanged) {
                updateData['reactionRolesMenus.$.roles'] = updatedRoles;
            }
            
            if (Object.keys(updateData).length === 0) {
                return interaction.editReply('No changes were specified.');
            }
            
            // Use direct MongoDB update operation instead of modifying and saving the document
            await Guild.updateOne(
                { guildId, 'reactionRolesMenus.messageId': messageId },
                { $set: updateData }
            );
            
            // Find and update the message
            try {
                const updated = await updateReactionRoleMenuMessage({
                    interaction,
                    channelId: menu.channelId,
                    messageId: menu.messageId,
                    title: newTitle || menu.title,
                    description: newDescription || menu.description,
                    roles: rolesChanged ? updatedRoles : menu.roles,
                    maxSelections:
                        newMaxSelections !== null && newMaxSelections !== undefined ? newMaxSelections : menu.maxSelections,
                    isActive: menu.active
                });
                
                if (!updated) {
                    return interaction.editReply(`Menu updated in database, but couldn't update the message. It might have been deleted.`);
                }
            } catch (error) {
                console.error('Error updating message:', error);
                return interaction.editReply(`Menu updated in database, but couldn't update the message. It might have been deleted.`);
            }
            
            return interaction.editReply(`Successfully updated reaction roles menu "${newTitle || menu.title}".\nChanges: ${changes.join(', ')}`);
            
        } catch (error) {
            console.error('Error editing reaction roles menu:', error);
            return interaction.editReply('An error occurred while editing the reaction roles menu.');
        }
    }

    // Check if user has required permissions to use this command
    private async hasRequiredPermissions(interaction: Command.ChatInputCommandInteraction): Promise<boolean> {
        // Check if user is server owner
        if (interaction.guild?.ownerId === interaction.user.id) {
            return true;
        }
        
        // Check if user has Administrator permission
        if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return true;
        }
        
        // Check if user has Manage Roles permission
        if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
            return true;
        }
        
        // Check if user has the admin role set in the server
        const member = interaction.member;
        if (member && 'roles' in member) {
            const guildId = interaction.guildId!;
            const guildData = await Guild.findOne({ guildId });
            
            if (guildData?.adminRoleId && 'cache' in member.roles && member.roles.cache.has(guildData.adminRoleId)) {
                return true;
            }
        }
        
        return false;
    }

}