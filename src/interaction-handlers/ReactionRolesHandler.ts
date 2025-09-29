import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { StringSelectMenuInteraction, MessageFlags } from 'discord.js';
import { Guild } from '../models/Guild';

export class ReactionRolesHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.Context, options: InteractionHandler.Options) {
        super(context, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.SelectMenu
        });
    }

    public override parse(interaction: StringSelectMenuInteraction) {
        if (interaction.customId !== 'reaction-roles-select') return this.none();
        
        return this.some();
    }

    public async run(interaction: StringSelectMenuInteraction) {
        // Defer reply to prevent "interaction failed" message
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        try {
            const guildId = interaction.guildId!;
            const messageId = interaction.message.id;
            
            // Find the menu in the database
            const guildData = await Guild.findOne({ 
                guildId, 
                'reactionRolesMenus.messageId': messageId 
            });
            
            if (!guildData) {
                return interaction.editReply('This role selection menu is no longer configured. Please contact a server admin.');
            }
            
            const menu = guildData.reactionRolesMenus?.find(m => m.messageId === messageId);
            
            if (!menu) {
                return interaction.editReply('This role selection menu is no longer configured. Please contact a server admin.');
            }
            
            // Check if the menu is active
            if (!menu.active) {
                return interaction.editReply('This role selection menu is currently paused. Please try again later.');
            }
            
            // Get member and check if bot has permission to manage roles
            const member = interaction.guild?.members.cache.get(interaction.user.id);
            const botMember = interaction.guild?.members.me;
            
            if (!member || !botMember) {
                return interaction.editReply('An error occurred. Please try again later.');
            }
            
            if (!botMember.permissions.has('ManageRoles')) {
                return interaction.editReply('I don\'t have permission to manage roles anymore. Please contact a server admin.');
            }
            
            // Get all roles configured for this menu
            const availableRoles = menu.roles.map(r => r.roleId);
            
            // Get roles the user had from this menu
            const previousRoles = member.roles.cache
                .filter(role => availableRoles.includes(role.id))
                .map(role => role.id);
            
            // Get roles the user selected
            const selectedRoles = interaction.values;
            
            // Determine which roles to add and which to remove
            const rolesToAdd = selectedRoles.filter(roleId => !previousRoles.includes(roleId));
            const rolesToRemove = previousRoles.filter(roleId => !selectedRoles.includes(roleId));
            
            // Add and remove roles
            let addedRoles = [];
            let removedRoles = [];
            
            for (const roleId of rolesToAdd) {
                try {
                    const role = interaction.guild?.roles.cache.get(roleId);
                    if (role && botMember.roles.highest.comparePositionTo(role) > 0 && !role.managed) {
                        await member.roles.add(role);
                        addedRoles.push(role.name);
                    }
                } catch (error) {
                    console.error(`Error adding role ${roleId} to user ${member.id}:`, error);
                }
            }
            
            for (const roleId of rolesToRemove) {
                try {
                    const role = interaction.guild?.roles.cache.get(roleId);
                    if (role && botMember.roles.highest.comparePositionTo(role) > 0 && !role.managed) {
                        await member.roles.remove(role);
                        removedRoles.push(role.name);
                    }
                } catch (error) {
                    console.error(`Error removing role ${roleId} from user ${member.id}:`, error);
                }
            }
            
            // Send confirmation message
            let responseMessage = 'Your roles have been updated.';
            
            if (addedRoles.length > 0) {
                responseMessage += `\nAdded roles: ${addedRoles.join(', ')}`;
            }
            
            if (removedRoles.length > 0) {
                responseMessage += `\nRemoved roles: ${removedRoles.join(', ')}`;
            }
            
            return interaction.editReply(responseMessage);
            
        } catch (error) {
            console.error('Error processing reaction roles selection:', error);
            return interaction.editReply('An error occurred while processing your role selection. Please try again later.');
        }
    }
}