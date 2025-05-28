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
import { Guild } from '../../models/Guild';
import config from '../../config';
import { ErrorHandler } from '../../lib/structures/ErrorHandler';

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
        if (interaction.commandName === 'reactionroles') {
            const subcommand = interaction.options.getSubcommand();
            
            // Handle menu_id autocomplete for edit/delete/pause/resume
            if (['delete', 'pause', 'resume', 'edit'].includes(subcommand) && 
                interaction.options.getFocused(true).name === 'menu_id') {
                try {
                    const guildId = interaction.guildId!;
                    const guildData = await Guild.findOne({ guildId });
                    
                    if (!guildData || !guildData.reactionRolesMenus?.length) {
                        return interaction.respond([]);
                    }
                    
                    // If the option is 'all', add it (for pause/resume)
                    let choices = [];
                    if (['pause', 'resume'].includes(subcommand)) {
                        choices.push({ name: 'All menus', value: 'all' });
                    }
                    
                    // Add individual menus
                    const menus = guildData.reactionRolesMenus.map(menu => ({
                        name: `${menu.title} (${menu.messageId})`,
                        value: menu.messageId
                    }));
                    
                    choices = [...choices, ...menus];
                    return interaction.respond(choices);
                } catch (error) {
                    console.error('Error in autocomplete:', error);
                    return interaction.respond([]);
                }
            }
            
            // Handle remove_roles autocomplete for edit
            if (subcommand === 'edit' && 
                interaction.options.getFocused(true).name === 'remove_roles') {
                try {
                    const guildId = interaction.guildId!;
                    const menuId = interaction.options.getString('menu_id');
                    
                    if (!menuId) {
                        return interaction.respond([
                            { name: 'Please select a menu ID first', value: '' }
                        ]);
                    }
                    
                    const guildData = await Guild.findOne({ 
                        guildId, 
                        'reactionRolesMenus.messageId': menuId 
                    });
                    
                    if (!guildData) {
                        return interaction.respond([]);
                    }
                    
                    const menu = guildData.reactionRolesMenus?.find(m => m.messageId === menuId);
                    
                    if (!menu || !menu.roles.length) {
                        return interaction.respond([]);
                    }
                    
                    // Create choices from available roles
                    const choices = [];
                    for (const roleData of menu.roles) {
                        const role = interaction.guild?.roles.cache.get(roleData.roleId);
                        const roleName = role ? role.name : 'Unknown Role';
                        choices.push({
                            name: `${roleData.label} (${roleName})`,
                            value: roleData.roleId
                        });
                    }
                    
                    return interaction.respond(choices);
                } catch (error) {
                    console.error('Error in remove_roles autocomplete:', error);
                    return interaction.respond([]);
                }
            }
            
            // Handle update_emoji_role autocomplete for edit
            if (subcommand === 'edit' && 
                interaction.options.getFocused(true).name === 'update_emoji_role') {
                try {
                    const guildId = interaction.guildId!;
                    const menuId = interaction.options.getString('menu_id');
                    
                    if (!menuId) {
                        return interaction.respond([
                            { name: 'Please select a menu ID first', value: '' }
                        ]);
                    }
                    
                    const guildData = await Guild.findOne({ 
                        guildId, 
                        'reactionRolesMenus.messageId': menuId 
                    });
                    
                    if (!guildData) {
                        return interaction.respond([]);
                    }
                    
                    const menu = guildData.reactionRolesMenus?.find(m => m.messageId === menuId);
                    
                    if (!menu || !menu.roles.length) {
                        return interaction.respond([]);
                    }
                    
                    // Create choices from available roles
                    const choices = [];
                    for (const roleData of menu.roles) {
                        const role = interaction.guild?.roles.cache.get(roleData.roleId);
                        const roleName = role ? role.name : 'Unknown Role';
                        const hasEmoji = roleData.emoji ? '✓' : '✗';
                        choices.push({
                            name: `${hasEmoji} ${roleData.label} (${roleName})`,
                            value: roleData.roleId
                        });
                    }
                    
                    return interaction.respond(choices);
                } catch (error) {
                    console.error('Error in update_emoji_role autocomplete:', error);
                    return interaction.respond([]);
                }
            }
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
        const roles = [];
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
                const emoji = this.parseEmoji(emojiInput);
                
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
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const menuId = interaction.options.getString('menu_id', true);
        const guildId = interaction.guildId!;
        
        try {
            if (menuId === 'all') {
                // Pause all menus
                const guildData = await Guild.findOne({ guildId });
                
                if (!guildData || !guildData.reactionRolesMenus?.length) {
                    return interaction.editReply('No reaction roles menus found in this server.');
                }
                
                // Get active menus
                const activeMenus = guildData.reactionRolesMenus.filter(m => m.active);
                if (activeMenus.length === 0) {
                    return interaction.editReply('All menus are already paused.');
                }
                
                // Update each active menu's message to be disabled
                let updatedCount = 0;
                let failedCount = 0;
                
                for (const menu of activeMenus) {
                    const updated = await this.updateMenuMessage(
                        interaction,
                        menu.channelId,
                        menu.messageId,
                        menu.title,
                        menu.description,
                        menu.roles,
                        menu.maxSelections,
                        false // set as inactive
                    );
                    
                    if (updated) {
                        updatedCount++;
                    } else {
                        failedCount++;
                    }
                }
                
                // Update the database
                await Guild.updateMany(
                    { guildId, 'reactionRolesMenus.active': true },
                    { $set: { 'reactionRolesMenus.$[].active': false } }
                );
                
                let response = `Successfully paused all reaction roles menus in the database.`;
                if (updatedCount > 0) {
                    response += `\nUpdated ${updatedCount} menu message${updatedCount !== 1 ? 's' : ''}.`;
                }
                if (failedCount > 0) {
                    response += `\n${failedCount} menu message${failedCount !== 1 ? 's' : ''} could not be updated (may have been deleted).`;
                }
                
                return interaction.editReply(response);
            } else {
                // Pause specific menu
                const guildData = await Guild.findOne({ guildId, 'reactionRolesMenus.messageId': menuId });
                
                if (!guildData) {
                    return interaction.editReply('Reaction roles menu not found.');
                }
                
                const menu = guildData.reactionRolesMenus?.find(m => m.messageId === menuId);
                
                if (!menu) {
                    return interaction.editReply('Reaction roles menu not found.');
                }
                
                if (!menu.active) {
                    return interaction.editReply('This menu is already paused.');
                }
                
                // Update the message with disabled select menu
                const updated = await this.updateMenuMessage(
                    interaction,
                    menu.channelId,
                    menu.messageId,
                    menu.title,
                    menu.description,
                    menu.roles,
                    menu.maxSelections,
                    false // set as inactive
                );
                
                // Update the database
                await Guild.updateOne(
                    { guildId, 'reactionRolesMenus.messageId': menuId },
                    { $set: { 'reactionRolesMenus.$.active': false } }
                );
                
                let response = `Successfully paused reaction roles menu "${menu.title}" in the database.`;
                if (updated) {
                    response += `\nThe menu message has been updated to reflect its paused state.`;
                } else {
                    response += `\nThe menu message could not be updated (it may have been deleted).`;
                }
                
                return interaction.editReply(response);
            }
        } catch (error) {
            console.error('Error pausing reaction roles menu:', error);
            return interaction.editReply('An error occurred while pausing the reaction roles menu.');
        }
    }

    private async handleResume(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const menuId = interaction.options.getString('menu_id', true);
        const guildId = interaction.guildId!;
        
        try {
            if (menuId === 'all') {
                // Resume all menus
                const guildData = await Guild.findOne({ guildId });
                
                if (!guildData || !guildData.reactionRolesMenus?.length) {
                    return interaction.editReply('No reaction roles menus found in this server.');
                }
                
                // Get inactive menus
                const inactiveMenus = guildData.reactionRolesMenus.filter(m => !m.active);
                if (inactiveMenus.length === 0) {
                    return interaction.editReply('All menus are already active.');
                }
                
                // Update each inactive menu's message to be enabled
                let updatedCount = 0;
                let failedCount = 0;
                
                for (const menu of inactiveMenus) {
                    const updated = await this.updateMenuMessage(
                        interaction,
                        menu.channelId,
                        menu.messageId,
                        menu.title,
                        menu.description,
                        menu.roles,
                        menu.maxSelections,
                        true // set as active
                    );
                    
                    if (updated) {
                        updatedCount++;
                    } else {
                        failedCount++;
                    }
                }
                
                // Update the database
                await Guild.updateMany(
                    { guildId, 'reactionRolesMenus.active': false },
                    { $set: { 'reactionRolesMenus.$[].active': true } }
                );
                
                let response = `Successfully resumed all reaction roles menus in the database.`;
                if (updatedCount > 0) {
                    response += `\nUpdated ${updatedCount} menu message${updatedCount !== 1 ? 's' : ''}.`;
                }
                if (failedCount > 0) {
                    response += `\n${failedCount} menu message${failedCount !== 1 ? 's' : ''} could not be updated (may have been deleted).`;
                }
                
                return interaction.editReply(response);
            } else {
                // Resume specific menu
                const guildData = await Guild.findOne({ guildId, 'reactionRolesMenus.messageId': menuId });
                
                if (!guildData) {
                    return interaction.editReply('Reaction roles menu not found.');
                }
                
                const menu = guildData.reactionRolesMenus?.find(m => m.messageId === menuId);
                
                if (!menu) {
                    return interaction.editReply('Reaction roles menu not found.');
                }
                
                if (menu.active) {
                    return interaction.editReply('This menu is already active.');
                }
                
                // Update the message with enabled select menu
                const updated = await this.updateMenuMessage(
                    interaction,
                    menu.channelId,
                    menu.messageId,
                    menu.title,
                    menu.description,
                    menu.roles,
                    menu.maxSelections,
                    true // set as active
                );
                
                // Update the database
                await Guild.updateOne(
                    { guildId, 'reactionRolesMenus.messageId': menuId },
                    { $set: { 'reactionRolesMenus.$.active': true } }
                );
                
                let response = `Successfully resumed reaction roles menu "${menu.title}" in the database.`;
                if (updated) {
                    response += `\nThe menu message has been updated and is now interactive.`;
                } else {
                    response += `\nThe menu message could not be updated (it may have been deleted).`;
                }
                
                return interaction.editReply(response);
            }
        } catch (error) {
            console.error('Error resuming reaction roles menu:', error);
            return interaction.editReply('An error occurred while resuming the reaction roles menu.');
        }
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
            const updateData: any = {};
            const changes: string[] = [];
            
            // For role changes, we need to get the current roles first
            let updatedRoles = [...menu.roles];
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
                    const emoji = this.parseEmoji(addEmoji);
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
                
                const emoji = this.parseEmoji(updateEmoji);
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
                const updated = await this.updateMenuMessage(
                    interaction,
                    menu.channelId,
                    menu.messageId,
                    newTitle || menu.title,
                    newDescription || menu.description,
                    rolesChanged ? updatedRoles : menu.roles,
                    newMaxSelections !== null && newMaxSelections !== undefined ? newMaxSelections : menu.maxSelections,
                    menu.active // preserve active state
                );
                
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

    private async updateMenuMessage(
        interaction: Command.ChatInputCommandInteraction,
        channelId: string, 
        messageId: string, 
        title: string, 
        description: string, 
        roles: any[], 
        maxSelections: number, 
        isActive: boolean
    ): Promise<boolean> {
        try {
            const channel = await interaction.guild?.channels.fetch(channelId) as TextChannel;
            if (!channel) {
                return false;
            }
            
            const message = await channel.messages.fetch(messageId);
            if (!message) {
                return false;
            }
            
            // Create updated embed
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle(title)
                .setDescription(description)
                .setFooter({ 
                    text: isActive ? 
                        `Select roles from the dropdown menu below` : 
                        `This role selection menu is currently paused`
                });
            
            // Create updated select menu options
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
            
            // Create updated select menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('reaction-roles-select')
                .setPlaceholder(isActive ? 'Select roles...' : 'Menu is currently paused')
                .addOptions(options)
                .setDisabled(!isActive) // Here's the key part - disable when not active
                .setMinValues(0)
                .setMaxValues(maxSelections > 0 ? 
                    Math.min(maxSelections, roles.length) : 
                    roles.length
                );
            
            const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(selectMenu);
            
            // Edit the message
            await message.edit({
                embeds: [embed],
                components: [row]
            });
            
            return true;
        } catch (error) {
            console.error('Error updating menu message:', error);
            return false;
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

    /**
     * Parses emoji input into a string format that can be stored in the database
     * Returns undefined if no valid emoji, otherwise returns a string representation
     */
    private parseEmoji(emojiInput: string | null): string | undefined {
        if (!emojiInput) return undefined;
        
        // Check if it's a Discord emoji mention like <:name:id> or <a:name:id>
        const discordEmojiRegex = /<(a)?:(\w+):(\d+)>/;
        const match = emojiInput.match(discordEmojiRegex);
        
        if (match) {
            // It's a Discord custom emoji - store it in the same format it was provided
            return emojiInput;
        } else {
            // Assume it's a Unicode emoji or plain text
            return emojiInput;
        }
    }
}