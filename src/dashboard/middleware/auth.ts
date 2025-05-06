import { Request, Response, NextFunction } from 'express';

export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/login');
}

export function hasGuildPermissions(req: Request, res: Response, next: NextFunction): void {
    const user = req.user as any;
    if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    
    const guildId = req.params.guildId;
    const guilds = user.guilds || [];
    const guild = guilds.find((g: any) => g.id === guildId);

    if (!guild) {
        res.status(403).json({ error: 'No access to this guild' });
        return;
    }

    // Check if user has ADMINISTRATOR (0x8) or MANAGE_GUILD (0x20) permission
    const permissions = BigInt(guild.permissions || '0');
    const hasPermission = (permissions & BigInt(0x8)) === BigInt(0x8) || 
                          (permissions & BigInt(0x20)) === BigInt(0x20);

    if (!hasPermission) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
    }

    next();
}