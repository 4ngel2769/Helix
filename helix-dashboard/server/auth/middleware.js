const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
};

// Check if user has access to a guild's settings
const hasGuildAccess = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { guildId } = req.params;
    const userGuilds = req.user.guilds || [];
    
    // Check if user is in the guild
    const guild = userGuilds.find(g => g.id === guildId);
    if (!guild) {
        return res.status(403).json({ error: 'You do not have access to this server' });
    }
    
    // Check if user has manage server permissions
    const hasManageGuild = (guild.permissions & 0x20) === 0x20; // Check MANAGE_GUILD permission
    if (!hasManageGuild) {
        return res.status(403).json({ error: 'You need Manage Server permission to access these settings' });
    }
    
    next();
};

module.exports = {
    isAuthenticated,
    hasGuildAccess
};