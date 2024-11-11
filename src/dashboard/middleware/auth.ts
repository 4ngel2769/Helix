import { Request, Response, NextFunction } from 'express';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import { PermissionsBitField } from 'discord.js';

export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/login');
}

export function hasGuildPermissions(req: ApiRequest, res: ApiResponse, next: () => void): void {
    if (!req.auth?.token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const guildId = req.params.guildId;
    const guilds = (req.auth.token as unknown as { guilds: { id: string; permissions: string }[] }).guilds;
    const guild = guilds?.find((g) => g.id === guildId);

    if (!guild) {
        return res.status(403).json({ error: 'No access to this guild' });
    }

    const permissions = new PermissionsBitField(BigInt(guild.permissions ?? '0'));
    const hasPermission = permissions.has('Administrator') || permissions.has('ManageGuild');

    if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
} 