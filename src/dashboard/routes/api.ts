import { Router } from 'express';
import { isAuthenticated, hasGuildPermissions } from '../middleware/auth';
import { Guild } from '../../models/Guild';
import { container } from '@sapphire/framework';
import type { SapphireClient } from '@sapphire/framework';
import { OAuth2Scopes } from 'discord.js';
import type { DiscordUser } from '../types';
import type { RequestHandler } from 'express';

const router = Router();

// Get user's guilds
const getUserGuilds: RequestHandler = (req, res) => {
    const user = req.user as DiscordUser;
    const client = container.client as SapphireClient;

    try {
        if (!user.guilds) {
            res.status(400).json({ error: 'No guilds found' });
            return;
        }

        const guilds = user.guilds.filter((guild) => {
            const permissions = BigInt(guild.permissions ?? '0');
            return (permissions & BigInt(0x8) || permissions & BigInt(0x20));
        });

        const enrichedGuilds = guilds.map((guild) => ({
            ...guild,
            hasBot: client.guilds.cache.has(guild.id),
            icon: guild.icon 
                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` 
                : 'https://cdn.discordapp.com/embed/avatars/0.png'
        }));

        container.logger.debug(`Fetched ${enrichedGuilds.length} guilds for user ${user.username}`);
        res.json({ guilds: enrichedGuilds });
    } catch (error) {
        container.logger.error(error);
        res.status(500).json({ error: 'Failed to fetch guilds' });
    }
};

// Get guild settings
const getGuildSettings: RequestHandler = (req, res) => {
    Guild.findOne({ guildId: req.params.guildId })
        .then((guildData) => {
            if (!guildData) {
                container.logger.debug(`No settings found for guild ${req.params.guildId}`);
                res.json({ 
                    guildId: req.params.guildId,
                    isModeration: false,
                    isAdministration: false,
                    isFunModule: false,
                    isWelcomingModule: false,
                    isVerificationModule: false
                });
                return;
            }

            container.logger.debug(`Fetched settings for guild ${req.params.guildId}`);
            res.json(guildData);
        })
        .catch((error) => {
            container.logger.error(error);
            res.status(500).json({ error: 'Failed to fetch guild settings' });
        });
};

// Update guild settings
const updateGuildSettings: RequestHandler = (req, res) => {
    const client = container.client as SapphireClient;
    const user = req.user as DiscordUser;

    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) {
        res.status(404).json({ error: 'Guild not found' });
        return;
    }

    Guild.findOneAndUpdate(
        { guildId: req.params.guildId },
        { 
            $set: {
                ...req.body,
                verificationLastModifiedBy: {
                    userId: user.id,
                    username: user.username,
                    timestamp: new Date()
                }
            }
        },
        { new: true, upsert: true }
    )
        .then((guildData) => {
            container.logger.debug(`Updated settings for guild ${req.params.guildId} by user ${user.username}`);
            res.json(guildData);
        })
        .catch((error) => {
            container.logger.error(error);
            res.status(500).json({ error: 'Failed to update guild settings' });
        });
};

// Add bot to guild
const addBotToGuild: RequestHandler = (req, res) => {
    const client = container.client as SapphireClient;
    const guildId = req.params.guildId;

    try {
        if (client.guilds.cache.has(guildId)) {
            res.status(400).json({ error: 'Bot is already in this guild' });
            return;
        }

        const invite = client.generateInvite({
            scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
            permissions: ['Administrator']
        });

        res.json({ inviteUrl: invite });
    } catch (error) {
        container.logger.error(error);
        res.status(500).json({ error: 'Failed to generate invite link' });
    }
};

// Route definitions
router.get('/guilds', isAuthenticated, getUserGuilds);
router.get('/guilds/:guildId/settings', isAuthenticated, hasGuildPermissions, getGuildSettings);
router.patch('/guilds/:guildId/settings', isAuthenticated, hasGuildPermissions, updateGuildSettings);
router.post('/guilds/:guildId/add', isAuthenticated, addBotToGuild);

export const apiRouter = router;