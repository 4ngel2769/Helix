import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { client } from '../../index';

const router = Router();

router.get('/', isAuthenticated, async (req, res) => {
    const user = req.user as any;
    
    // Get user's guilds
    const guilds = user.guilds.filter((guild: any) => {
        const perms = BigInt(guild.permissions);
        return (perms & BigInt(0x20)) === BigInt(0x20); // MANAGE_GUILD permission
    });

    // Check which guilds have the bot
    const managedGuilds = guilds.map((guild: any) => ({
        ...guild,
        hasBot: client.guilds.cache.has(guild.id)
    }));

    res.json({ guilds: managedGuilds });
});

export const dashboardRouter = router; 