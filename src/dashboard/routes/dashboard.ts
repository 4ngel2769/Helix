import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { container } from '@sapphire/framework';
import type { SapphireClient } from '@sapphire/framework';
import type { DiscordUser } from '../types';
import type { RequestHandler } from 'express';

const router = Router();

const getDashboard: RequestHandler = (req, res) => {
    const user = req.user as DiscordUser;
    const client = container.client as SapphireClient;
    
    try {
        // Get user's guilds
        if (!user.guilds) {
            res.status(400).json({ error: 'No guilds found' });
            return;
        }

        const guilds = user.guilds.filter((guild) => {
            const permissions = BigInt(guild.permissions?.toString() ?? '0');
            return (permissions & BigInt(0x20)) === BigInt(0x20); // MANAGE_GUILD permission
        });

        // Check which guilds have the bot
        const managedGuilds = guilds.map((guild) => ({
            ...guild,
            hasBot: client.guilds.cache.has(guild.id),
            icon: guild.icon 
                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` 
                : 'https://cdn.discordapp.com/embed/avatars/0.png'
        }));

        container.logger.debug(`Fetched ${managedGuilds.length} managed guilds for user ${user.username}`);
        res.json({ guilds: managedGuilds });
    } catch (error) {
        container.logger.error(error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
};

router.get('/', isAuthenticated, getDashboard);

export const dashboardRouter = router; 