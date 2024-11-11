import express from 'express';
import { container } from '@sapphire/framework';
import type { NextFunction, Request, Response } from 'express';
import { PermissionFlagsBits } from 'discord.js';
import { Guild } from '../../models/Guild';

export const router = express.Router();

interface DiscordGuildAPI {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
}

function ensureAuthenticated(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  if (req.isAuthenticated()) return next();
  res.redirect('/auth/login');
}

router.get('/', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as { accessToken: string };
    
    // Get user's guilds from Discord
    const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${user.accessToken}`
      }
    });
    
    const userGuilds = (await response.json()) as DiscordGuildAPI[];

    // Get bot's guilds
    const botGuilds = container.client.guilds.cache;

    // Filter guilds where user has manage permissions
    const managedGuilds = userGuilds.filter(guild => 
      (BigInt(guild.permissions) & PermissionFlagsBits.ManageGuild) === PermissionFlagsBits.ManageGuild
    );

    res.render('dashboard/index', {
      user: req.user,
      managedGuilds,
      botGuilds,
      client: container.client
    });
  } catch (error) {
    container.logger.error(error);
    res.status(500).render('error', { error });
  }
});

router.get('/servers/:guildId', ensureAuthenticated, async (req, res) => {
  try {
    const { guildId } = req.params;
    
    // Get guild settings from database
    const guildData = await Guild.findOne({ guildId });
    
    // Get guild from bot cache
    const guild = container.client.guilds.cache.get(guildId);
    
    if (!guild) {
      return res.redirect('/dashboard');
    }

    res.render('dashboard/server', {
      user: req.user,
      guild,
      guildData,
      client: container.client
    });
  } catch (error) {
    container.logger.error(error);
    res.status(500).render('error', { error });
  }
}); 