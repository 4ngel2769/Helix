import './lib/setup';
import { LogLevel, SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits, OAuth2Scopes, Partials } from 'discord.js';
import '@sapphire/plugin-api/register';
import '@kbotdev/plugin-modules/register';
import '@sapphire/plugin-hmr/register';
import config from './config';
import { verifyDatabaseConnection } from './lib/utils/dbCheck';
import cors from 'cors';
import helmet from 'helmet';

const hmrOptions = {
    enabled: process.env.NODE_ENV !== 'production'
};

const client = new SapphireClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // Required for prefix commands
    ],
    partials: [Partials.Channel],
    // Add these options for message commands
    defaultPrefix: config.bot.defaultPrefix || '!', // Make sure this is set
    regexPrefix: /^(hey +)?bot[,! ]/i, // Optional: allows "bot," "hey bot" etc.
    caseInsensitiveCommands: true,
    caseInsensitivePrefixes: true,
    loadMessageCommandListeners: true, // This is important!
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

const allowedOrigins = Array.from(
	new Set([config.dashboard.domain, config.api.origin].filter(Boolean))
) as string[];

function registerApiMiddlewares() {
	try {
		if (!client.server || !(client.server as any).middlewares || typeof (client.server as any).middlewares.set !== 'function') {
			client.logger.warn('API middlewares not registered: server.middlewares not available');
			return;
		}

		(client.server as any).middlewares.set(
			'helmet',
			helmet({
				contentSecurityPolicy: false
			}) as any
		);

		(client.server as any).middlewares.set(
			'cors',
			cors({
				origin: allowedOrigins,
				credentials: true
			}) as any
		);

		(client.server as any).middlewares.set('cookieParser', (rawReq: any, _res: any, next: any) => {
			const req = rawReq;
			const cookies: Record<string, string> = {};
			const header = (req && req.headers && req.headers.cookie) || '';
			if (header) {
				header.split(';').forEach((cookie: string) => {
					const [k, ...v] = cookie.trim().split('=');
					if (k) cookies[k] = decodeURIComponent((v || []).join('='));
				});
			}
			req.cookies = cookies;
			next();
		});

		client.logger.info('API security middlewares registered');
	} catch (err) {
		client.logger.warn('Unable to register API middlewares', err);
	}
}

const main = async () => {
    try {
        await verifyDatabaseConnection();

        if (!config.bot.token) {
            console.warn('⚠️ No bot token present in config.bot.token or DISCORD_TOKEN. Aborting login.');
        }

        await client.login(config.bot.token);
        client.logger.info('✅ Logged in');

		// Register API middlewares (CORS, helmet, cookie parsing)
		registerApiMiddlewares();
    } catch (error) {
        client.logger.fatal(error);
        await client.destroy();
        process.exit(1);
    }
};

void main();
