import './lib/setup';
import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits, OAuth2Scopes, Partials } from 'discord.js';
import '@sapphire/plugin-api/register';
import '@kbotdev/plugin-modules/register';
import '@sapphire/plugin-hmr/register';
import config from './config';
import {
    // initializeDatabase,
    verifyDatabaseConnection
} from './lib/utils/dbCheck';

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
    modules: {
        enabled: true,
    },
    hmr: hmrOptions,
    api: {
        auth: {
            id: config.dashboard.oauth.clientId,
            secret: config.dashboard.oauth.clientSecret,
            cookie: 'SAPPHIRE_AUTH',
            redirect: config.dashboard.redirectUri,
            scopes: [OAuth2Scopes.Identify, OAuth2Scopes.Guilds],
            domainOverwrite: config.dashboard.domain
            
        },
        prefix: '/api',
        origin: config.dashboard.domain,
        listenOptions: {
            port: config.dashboard.port
        }
    }
});

const main = async () => {
    try {
        // Initialize database connection before bot login
        await verifyDatabaseConnection();
        
        // Login to Discord
        await client.login();
        client.logger.info('Logged in');
    } catch (error) {
        client.logger.fatal(error);
        await client.destroy();
        process.exit(1);
    }
};

void main();
