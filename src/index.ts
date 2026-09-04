import './lib/setup';
import { SapphireClient, container } from '@sapphire/framework';
import { GatewayIntentBits, OAuth2Scopes, Partials } from 'discord.js';
import '@sapphire/plugin-api/register';
import '@kbotdev/plugin-modules/register';
import '@sapphire/plugin-hmr/register';
import rateLimit from 'express-rate-limit';
import config from './config';
import { verifyDatabaseConnection } from './lib/utils/dbCheck';
import { Guild } from './models/Guild';
import { initializePerformanceMonitor } from './lib/services/TPSMonitor';
import { AuctionService } from './lib/services/AuctionService';
import { getGuildPrefixFromCache, setGuildPrefixInCache } from './lib/utils/prefixCache';

function validateEnv() {
    if (!config.bot.token) {
        throw new Error('DISCORD_TOKEN is not set');
    }
    if (!config.bot.mongoUri) {
        throw new Error('MONGO_URI is not set');
    }
    if (!config.bot.client.id || !config.bot.client.secret) {
        container.logger.warn('⚠️ DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET is missing. Dashboard authentication will not work.');
    }
}

const hmrOptions = {
    enabled: process.env.NODE_ENV !== 'production'
};
const defaultPrefix = config.bot.defaultPrefix || 'x';

const client = new SapphireClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel],
    defaultPrefix: defaultPrefix,
    fetchPrefix: async (message) => {
        // If in DMs, use default prefix
        if (!message.guild) return defaultPrefix;

        const cachedPrefix = getGuildPrefixFromCache(message.guild.id);
        if (cachedPrefix) return cachedPrefix;
        
        try {
            // Fetch guild-specific prefix from database
            const guildData = await Guild.findOne({ guildId: message.guild.id }, { prefix: 1 }).lean();
            const resolvedPrefix = guildData?.prefix || defaultPrefix;
            setGuildPrefixInCache(message.guild.id, resolvedPrefix);
            return resolvedPrefix;
        } catch (error) {
            container.logger.error('Error fetching prefix:', error);
            return getGuildPrefixFromCache(message.guild.id) || defaultPrefix;
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

if ((client as any).api?.server) {
    (client as any).api.server.use(rateLimit({ windowMs: 60000, max: 30, standardHeaders: true, legacyHeaders: false }));
}

const main = async () => {
    try {
        validateEnv();
        await verifyDatabaseConnection();
        initializePerformanceMonitor(client);

        await client.login(config.bot.token);
        client.logger.info('✅ Logged in');
        client.logger.info('🍪 Using @sapphire/plugin-api built-in cookies/auth middlewares');

        setInterval(() => {
            void AuctionService.processExpiredAuctions().catch((err) => {
                container.logger.error('Error in expired auctions background job:', err);
            });
        }, 60000);
        client.logger.info('Started expired auctions processor interval (every 60s)');
    } catch (error) {
        client.logger.fatal(error);
        await client.destroy();
        process.exit(1);
    }
};

void main().catch((error) => {
    container.logger.fatal('Unhandled rejection in main():', error);
    process.exit(1);
});
