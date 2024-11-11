import { Request, Response, NextFunction } from 'express';
import { Guild } from '../../models/Guild';
import { container } from '@sapphire/framework';
import type { DiscordUser } from '../types';

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.redirect('/auth/login');
}

export async function hasGuildPermissions(req: Request, res: Response, next: NextFunction) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const user = req.user as DiscordUser;
        const guildId = req.params.guildId;
        const guild = user.guilds?.find((g) => g.id === guildId);

        if (!guild) {
            return res.status(403).json({ error: 'No access to this guild' });
        }

        // Check if user has admin or manage guild permissions
        const permissions = BigInt(guild.permissions ?? '0');
        const hasPermission = (permissions & BigInt(0x8) || permissions & BigInt(0x20));

        if (!hasPermission) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Check if bot is in guild
        const client = req.app.get('client');
        const botGuild = client.guilds.cache.get(guildId);
        
        if (!botGuild) {
            return res.status(404).json({ error: 'Bot not in guild' });
        }

        // Get guild settings
        const guildData = await Guild.findOne({ guildId });
        if (!guildData) {
            // Create default settings if none exist
            await Guild.create({ 
                guildId,
                isModeration: false,
                isAdministration: false,
                isFunModule: false,
                isWelcomingModule: false,
                isVerificationModule: false
            });
        }

        return next();
    } catch (error) {
        container.logger.error(error);
        return res.status(500).json({ error: 'Failed to verify guild permissions' });
    }
} 