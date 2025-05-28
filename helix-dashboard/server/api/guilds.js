const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../auth/middleware');
const fetch = require('node-fetch');
const mongoose = require('mongoose');
const Guild = mongoose.model('Guild');
const config = require('../../../dist/config');

// Get all guilds the user is in
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userGuilds = req.user.guilds || [];
        
        // Get bot's guilds from Discord API
        const botClient = req.app.get('botClient');
        const botGuilds = botClient.guilds.cache.map(guild => guild.id);
        
        // Enhance user guild data with bot presence
        const enhancedGuilds = userGuilds.map(guild => ({
            ...guild,
            botPresent: botGuilds.includes(guild.id),
            canManage: (guild.permissions & 0x20) === 0x20, // Check MANAGE_GUILD permission
            iconURL: guild.icon ? 
                `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` : 
                null
        }));
        
        res.json(enhancedGuilds);
    } catch (error) {
        console.error('Error fetching guilds:', error);
        res.status(500).json({ error: 'Failed to fetch guilds' });
    }
});

// Get a specific guild's settings
router.get('/:guildId', isAuthenticated, async (req, res) => {
    try {
        const { guildId } = req.params;
        
        // Get guild from database
        const guildData = await Guild.findOne({ guildId });
        if (!guildData) {
            return res.status(404).json({ error: 'Guild not found in database' });
        }
        
        // Get additional data from Discord API
        const botClient = req.app.get('botClient');
        const guild = botClient.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.status(404).json({ error: 'Bot is not in this guild' });
        }
        
        // Return combined data
        res.json({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ dynamic: true, size: 128 }),
            memberCount: guild.memberCount,
            settings: {
                prefix: guildData.prefix || config.bot.defaultPrefix,
                modules: guildData.modules || {},
                // Add other settings as needed
            }
        });
    } catch (error) {
        console.error('Error fetching guild:', error);
        res.status(500).json({ error: 'Failed to fetch guild settings' });
    }
});

// Generate invite URL for a guild
router.get('/:guildId/invite', isAuthenticated, (req, res) => {
    const { guildId } = req.params;
    
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${
        config.dashboard.oauth.clientId
    }&permissions=8&scope=bot%20applications.commands&guild_id=${guildId}&disable_guild_select=true`;
    
    res.json({ inviteUrl });
});

module.exports = router;