const express = require('express');
const router = express.Router();
const { isAuthenticated, hasGuildAccess } = require('../auth/middleware');
const mongoose = require('mongoose');
const Guild = mongoose.model('Guild');

// Get all reaction roles menus for a guild
router.get('/guilds/:guildId/reactionroles', isAuthenticated, hasGuildAccess, async (req, res) => {
    try {
        const { guildId } = req.params;
        
        // Get guild data from database
        const guildData = await Guild.findOne({ guildId });
        
        if (!guildData) {
            return res.status(404).json({ error: 'Guild not found in database' });
        }
        
        // Return reaction roles menus
        const reactionRolesMenus = guildData.reactionRolesMenus || [];
        
        // Enhance with additional data from Discord
        const botClient = req.app.get('botClient');
        const guild = botClient.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.json(reactionRolesMenus);
        }
        
        // Add channel and role data
        const enhancedMenus = reactionRolesMenus.map(menu => {
            const channel = guild.channels.cache.get(menu.channelId);
            const roles = menu.roles.map(role => {
                const guildRole = guild.roles.cache.get(role.roleId);
                return {
                    ...role,
                    name: guildRole?.name || 'Unknown Role',
                    color: guildRole?.hexColor || '#99AAB5',
                    exists: Boolean(guildRole)
                };
            });
            
            return {
                ...menu.toObject(),
                channelName: channel?.name || 'Unknown Channel',
                channelExists: Boolean(channel),
                roles
            };
        });
        
        res.json(enhancedMenus);
    } catch (error) {
        console.error('Error fetching reaction roles:', error);
        res.status(500).json({ error: 'Failed to fetch reaction roles' });
    }
});

// Create a new reaction roles menu
router.post('/guilds/:guildId/reactionroles', isAuthenticated, hasGuildAccess, async (req, res) => {
    try {
        const { guildId } = req.params;
        const { title, description, channelId, roles, maxSelections } = req.body;
        
        // Validate request body
        if (!title || !description || !channelId || !roles || !Array.isArray(roles) || roles.length === 0) {
            return res.status(400).json({ error: 'Invalid request body' });
        }
        
        // Get guild data
        const botClient = req.app.get('botClient');
        const guild = botClient.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.status(404).json({ error: 'Bot is not in this guild' });
        }
        
        // Validate channel
        const channel = guild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) {
            return res.status(400).json({ error: 'Invalid channel' });
        }
        
        // Validate roles
        for (const role of roles) {
            const guildRole = guild.roles.cache.get(role.roleId);
            if (!guildRole) {
                return res.status(400).json({ error: `Role ${role.roleId} does not exist` });
            }
            
            if (guildRole.managed) {
                return res.status(400).json({ error: `Role "${guildRole.name}" is managed by an integration` });
            }
            
            const botMember = guild.members.cache.get(botClient.user.id);
            if (botMember.roles.highest.comparePositionTo(guildRole) <= 0) {
                return res.status(400).json({ error: `Bot's highest role must be above "${guildRole.name}" role` });
            }
        }
        
        // Create embed
        const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: `Select roles from the dropdown menu below` });
        
        // Create select menu options
        const options = roles.map(role => {
            const option = new StringSelectMenuOptionBuilder()
                .setLabel(role.label)
                .setValue(role.roleId)
                .setDescription(`Get the ${guild.roles.cache.get(role.roleId)?.name || 'Unknown'} role`);
            
            if (role.emoji) {
                const discordEmojiRegex = /<(a)?:(\w+):(\d+)>/;
                const match = role.emoji.match(discordEmojiRegex);
                
                if (match) {
                    option.setEmoji({ name: match[2], id: match[3] });
                } else {
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
            .setDisabled(false)
            .setMinValues(0)
            .setMaxValues(maxSelections > 0 ? Math.min(maxSelections, roles.length) : roles.length);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        // Send the message
        const sentMessage = await channel.send({
            embeds: [embed],
            components: [row]
        });
        
        // Save to database
        const menuData = {
            messageId: sentMessage.id,
            channelId: channelId,
            title,
            description,
            roles,
            maxSelections: maxSelections || 0,
            active: true,
            createdBy: req.user.id,
            createdAt: new Date()
        };
        
        await Guild.updateOne(
            { guildId },
            { $push: { reactionRolesMenus: menuData } },
            { upsert: true }
        );
        
        res.status(201).json(menuData);
    } catch (error) {
        console.error('Error creating reaction roles menu:', error);
        res.status(500).json({ error: 'Failed to create reaction roles menu' });
    }
});

// Edit a reaction roles menu
router.put('/guilds/:guildId/reactionroles/:messageId', isAuthenticated, hasGuildAccess, async (req, res) => {
    try {
        const { guildId, messageId } = req.params;
        const updates = req.body;
        
        // Find the guild and menu
        const guildData = await Guild.findOne({ 
            guildId, 
            'reactionRolesMenus.messageId': messageId 
        });
        
        if (!guildData) {
            return res.status(404).json({ error: 'Reaction roles menu not found' });
        }
        
        // Apply the updates
        const updateData = {};
        
        if (updates.title) updateData['reactionRolesMenus.$.title'] = updates.title;
        if (updates.description) updateData['reactionRolesMenus.$.description'] = updates.description;
        if (updates.maxSelections !== undefined) updateData['reactionRolesMenus.$.maxSelections'] = updates.maxSelections;
        if (updates.active !== undefined) updateData['reactionRolesMenus.$.active'] = updates.active;
        
        // If roles are being updated, validate them first
        if (updates.roles) {
            const botClient = req.app.get('botClient');
            const guild = botClient.guilds.cache.get(guildId);
            
            if (!guild) {
                return res.status(404).json({ error: 'Bot is not in this guild' });
            }
            
            for (const role of updates.roles) {
                const guildRole = guild.roles.cache.get(role.roleId);
                if (!guildRole) {
                    return res.status(400).json({ error: `Role ${role.roleId} does not exist` });
                }
                
                if (guildRole.managed) {
                    return res.status(400).json({ error: `Role "${guildRole.name}" is managed by an integration` });
                }
            }
            
            updateData['reactionRolesMenus.$.roles'] = updates.roles;
        }
        
        // Update in database
        await Guild.updateOne(
            { guildId, 'reactionRolesMenus.messageId': messageId },
            { $set: updateData }
        );
        
        // Update the message if it exists
        const botClient = req.app.get('botClient');
        const guild = botClient.guilds.cache.get(guildId);
        
        if (guild) {
            const menu = guildData.reactionRolesMenus.find(m => m.messageId === messageId);
            const channel = guild.channels.cache.get(menu.channelId);
            
            if (channel && channel.isTextBased()) {
                try {
                    const message = await channel.messages.fetch(messageId);
                    
                    if (message) {
                        // Create updated embed
                        const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
                        
                        const updatedTitle = updates.title || menu.title;
                        const updatedDescription = updates.description || menu.description;
                        const updatedRoles = updates.roles || menu.roles;
                        const updatedMaxSelections = updates.maxSelections !== undefined ? updates.maxSelections : menu.maxSelections;
                        const isActive = updates.active !== undefined ? updates.active : menu.active;
                        
                        const embed = new EmbedBuilder()
                            .setColor('#5865F2')
                            .setTitle(updatedTitle)
                            .setDescription(updatedDescription)
                            .setFooter({ text: `Select roles from the dropdown menu below` });
                        
                        // Create options
                        const options = updatedRoles.map(role => {
                            const option = new StringSelectMenuOptionBuilder()
                                .setLabel(role.label)
                                .setValue(role.roleId)
                                .setDescription(`Get the ${guild.roles.cache.get(role.roleId)?.name || 'Unknown'} role`);
                            
                            if (role.emoji) {
                                const discordEmojiRegex = /<(a)?:(\w+):(\d+)>/;
                                const match = role.emoji.match(discordEmojiRegex);
                                
                                if (match) {
                                    option.setEmoji({ name: match[2], id: match[3] });
                                } else {
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
                            .setDisabled(!isActive)
                            .setMinValues(0)
                            .setMaxValues(updatedMaxSelections > 0 ? 
                                Math.min(updatedMaxSelections, updatedRoles.length) : 
                                updatedRoles.length);
                        
                        const row = new ActionRowBuilder().addComponents(selectMenu);
                        
                        // Update the message
                        await message.edit({
                            embeds: [embed],
                            components: [row]
                        });
                    }
                } catch (error) {
                    console.warn('Could not update message:', error);
                }
            }
        }
        
        res.json({ success: true, messageId });
    } catch (error) {
        console.error('Error updating reaction roles menu:', error);
        res.status(500).json({ error: 'Failed to update reaction roles menu' });
    }
});

// Delete a reaction roles menu
router.delete('/guilds/:guildId/reactionroles/:messageId', isAuthenticated, hasGuildAccess, async (req, res) => {
    try {
        const { guildId, messageId } = req.params;
        
        // Find the guild and menu
        const guildData = await Guild.findOne({ 
            guildId, 
            'reactionRolesMenus.messageId': messageId 
        });
        
        if (!guildData) {
            return res.status(404).json({ error: 'Reaction roles menu not found' });
        }
        
        const menu = guildData.reactionRolesMenus.find(m => m.messageId === messageId);
        
        // Try to delete the message
        const botClient = req.app.get('botClient');
        const guild = botClient.guilds.cache.get(guildId);
        
        if (guild) {
            const channel = guild.channels.cache.get(menu.channelId);
            
            if (channel && channel.isTextBased()) {
                try {
                    const message = await channel.messages.fetch(messageId);
                    if (message) {
                        await message.delete();
                    }
                } catch (error) {
                    console.warn('Could not delete message:', error);
                }
            }
        }
        
        // Remove from database
        await Guild.updateOne(
            { guildId },
            { $pull: { reactionRolesMenus: { messageId } } }
        );
        
        res.json({ success: true, messageId });
    } catch (error) {
        console.error('Error deleting reaction roles menu:', error);
        res.status(500).json({ error: 'Failed to delete reaction roles menu' });
    }
});

module.exports = router;