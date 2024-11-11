import express from 'express';
import { container } from '@sapphire/framework';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { PermissionFlagsBits } from 'discord.js';
import { Guild } from '../../models/Guild';

export const router = express.Router();

// Validation schema for guild settings
const GuildSettingsSchema = z.object({
    verificationMessage: z.string().optional(),
    verificationEnabled: z.boolean().optional(),
    welcomeChannel: z.string().optional(),
    welcomeMessage: z.string().optional(),
});

// Middleware to check if user has permission to manage guild
const checkGuildPermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { guildId } = req.params;
    const user = req.user as { accessToken: string };

    try {
        const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
            headers: {
                Authorization: `Bearer ${user.accessToken}`
            }
        });
        
        const userGuilds = await response.json() as Array<{ id: string; permissions: string }>;
        const guild = userGuilds.find(g => g.id === guildId);

        if (!guild || !(BigInt(guild.permissions) & PermissionFlagsBits.ManageGuild)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }

        next();
    } catch (error) {
        container.logger.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update guild settings
router.post('/guilds/:guildId/settings', checkGuildPermission, async (req: Request, res: Response): Promise<void> => {
    try {
        const { guildId } = req.params;
        const settings = GuildSettingsSchema.parse(req.body);

        // Update settings in database
        const updatedGuild = await Guild.findOneAndUpdate(
            { guildId },
            { $set: settings },
            { new: true, upsert: true }
        );

        // If welcome channel changed, update bot cache
        if (settings.welcomeChannel) {
            const guild = container.client.guilds.cache.get(guildId);
            if (guild) {
                // You might want to store this in your bot's cache or emit an event
                container.client.emit('guildSettingsUpdate', guild, settings);
            }
        }

        res.json(updatedGuild);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Invalid settings format', details: error.errors });
            return;
        }
        container.logger.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get guild settings
router.get('/guilds/:guildId/settings', checkGuildPermission, async (req: Request, res: Response): Promise<void> => {
    try {
        const { guildId } = req.params;
        const guildSettings = await Guild.findOne({ guildId });
        
        if (!guildSettings) {
            res.json({ guildId }); // Return default settings
            return;
        }

        res.json(guildSettings);
    } catch (error) {
        container.logger.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}); 