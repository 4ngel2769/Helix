import './lib/setup';
import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits, OAuth2Scopes, Partials } from 'discord.js';
import '@sapphire/plugin-api/register';
import '@kbotdev/plugin-modules/register';
import config from './config';
import {
    // initializeDatabase,
    verifyDatabaseConnection
} from './lib/utils/dbCheck';

// Import dashboard server with proper typing
interface DashboardServer {
    initServer: (client: SapphireClient) => void;
}

// Import dashboard server
let dashboardServer: DashboardServer | undefined;
try {
    // Using require for compatibility with CommonJS modules
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    dashboardServer = require('../helix-dashboard/server/index') as DashboardServer;
} catch (error: unknown) {
    // Safely access error message property
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('Dashboard server not found or could not be loaded:', errorMessage);
}

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
        
        // Initialize dashboard if available
        if (dashboardServer && typeof dashboardServer.initServer === 'function') {
            dashboardServer.initServer(client);
            client.logger.info('Dashboard server initialized');
        }
    } catch (error) {
        client.logger.fatal(error);
        await client.destroy();
        process.exit(1);
    }
};

void main();
