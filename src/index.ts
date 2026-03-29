import './lib/setup';
import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits, OAuth2Scopes, Partials } from 'discord.js';
import '@sapphire/plugin-api/register';
import '@kbotdev/plugin-modules/register';
import '@sapphire/plugin-hmr/register';
import config from './config';
import { verifyDatabaseConnection } from './lib/utils/dbCheck';
import { Guild } from './models/Guild';

const hmrOptions = {
    enabled: process.env.NODE_ENV !== 'production'
};

const client = new SapphireClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel],
    defaultPrefix: config.bot.defaultPrefix || 'x',
    fetchPrefix: async (message) => {
        // If in DMs, use default prefix
        if (!message.guild) return config.bot.defaultPrefix || 'x';
        
        try {
            // Fetch guild-specific prefix from database
            const guildData = await Guild.findOne({ guildId: message.guild.id });
            return guildData?.prefix || config.bot.defaultPrefix || 'x';
        } catch (error) {
            console.error('Error fetching prefix:', error);
            return config.bot.defaultPrefix || 'x';
        }
    },
    regexPrefix: /^(hey +)?bot[,! ]/i,
    caseInsensitiveCommands: true,
    caseInsensitivePrefixes: true,
    loadMessageCommandListeners: true,
    modules: {
        enabled: true,
    },
    hmr: hmrOptions,
    api: {
        auth: {
            id: config.dashboard.oauth.clientId,
            secret: config.dashboard.oauth.clientSecret,
            cookie: config.api.auth.cookie, // use cookie name from config
            redirect: config.dashboard.redirectUri,
            scopes: [OAuth2Scopes.Identify, OAuth2Scopes.Guilds],
            domainOverwrite: config.dashboard.domain
        },
        prefix: config.api.prefix,
        origin: config.api.origin,
        listenOptions: {
            port: config.dashboard.port
        }
    }
});

const main = async () => {
    try {
        await verifyDatabaseConnection();

        if (!config.bot.token) {
            console.warn('⚠️ No bot token present in config.bot.token or DISCORD_TOKEN. Aborting login.');
        }

        await client.login(config.bot.token);
        client.logger.info('✅ Logged in');
        client.logger.info('🍪 Using @sapphire/plugin-api built-in cookies/auth middlewares');
    } catch (error) {
        client.logger.fatal(error);
        await client.destroy();
        process.exit(1);
    }
};

void main();
