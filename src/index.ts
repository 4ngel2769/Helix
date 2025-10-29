import './lib/setup';
import { LogLevel, SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits, OAuth2Scopes, Partials } from 'discord.js';
import { Server, Middleware } from '@sapphire/plugin-api';
import type { Request, Response, NextFunction } from 'express';
import type { Message } from 'discord.js';
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
        GatewayIntentBits.MessageContent // Required for prefix commands
    ],
    partials: [Partials.Channel],
    // Add these options for message commands
    defaultPrefix: config.bot.defaultPrefix || '!', // Fallback prefix
    fetchPrefix: async (message: Message) => {
        // DMs use default prefix
        if (!message.guild) return config.bot.defaultPrefix;
        
        try {
            // Fetch guild config from database
            const guildData = await Guild.findOne({ guildId: message.guild.id });
            
            // Return custom prefix if set, otherwise use default
            return guildData?.prefix || config.bot.defaultPrefix;
        } catch (error) {
            console.error('Error fetching prefix:', error);
            return config.bot.defaultPrefix;
        }
    },
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
            port: config.bot.port // Use port 3000 for API, not 8080
        }
    }
});

const main = async () => {
    try {
        await verifyDatabaseConnection();

        // Log API configuration
        client.logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        client.logger.info('🔧 API CONFIGURATION:');
        client.logger.info(`   Port: ${config.bot.port}`);
        client.logger.info(`   Prefix: ${config.api.prefix}`);
        client.logger.info(`   Origin: ${config.api.origin}`);
        client.logger.info(`   Auth Domain: ${config.api.auth.domain}`);
        client.logger.info(`   Auth Cookie: ${config.api.auth.cookie}`);
        client.logger.info(`   Redirect URI: ${config.api.auth.redirect}`);
        client.logger.info(`   Dashboard OAuth Client ID: ${config.dashboard.oauth.clientId}`);
        client.logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (!config.bot.token) {
            console.warn('⚠️ No bot token present in config.bot.token or DISCORD_TOKEN. Aborting login.');
        }

        await client.login(config.bot.token);
        client.logger.info('✅ Logged in');

        // Register CORS middleware FIRST
        try {
            if (client.server && (client.server as any).middlewares && typeof (client.server as any).middlewares.set === 'function') {
                (client.server as any).middlewares.set('cors', (rawReq: any, rawRes: any, next: any) => {
                    const res = rawRes;
                    const origin = rawReq.headers.origin || '';
                    
                    // Allow requests from dashboard (localhost:8080) or production domain
                    const allowedOrigins = [
                        'http://localhost:8080',
                        'http://127.0.0.1:8080',
                        config.api.origin,
                        config.dashboard.domain
                    ];
                    
                    if (allowedOrigins.includes(origin) || !origin) {
                        res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:8080');
                        res.setHeader('Access-Control-Allow-Credentials', 'true');
                        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
                        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
                    }
                    
                    // Handle preflight requests
                    if (rawReq.method === 'OPTIONS') {
                        res.statusCode = 204;
                        res.end();
                        return;
                    }
                    
                    next();
                });
                client.logger.info('🌐 CORS middleware registered');
            }
        } catch (err) {
            client.logger.warn('CORS middleware: unable to register', err);
        }

        // Register cookie parsing middleware so API routes can read cookie-based auth
        // Use simple, untyped handler to avoid tight express typings; Sapphire's MiddlewareStore accepts this at runtime
        try {
            if (client.server && (client.server as any).middlewares && typeof (client.server as any).middlewares.set === 'function') {
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
                client.logger.info('🍪 Cookie middleware registered (simple)');
            } else {
                client.logger.warn('Cookie middleware: server.middlewares not available');
            }
        } catch (err) {
            client.logger.warn('Cookie middleware: unable to register', err);
        }

        // Log API server status
        if (client.server) {
            const server = client.server as Server;
            client.logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            client.logger.info('🌐 API SERVER STATUS:');
            client.logger.info(`   Server Instance: ${server ? 'Created' : 'NOT FOUND'}`);
            client.logger.info(`   Listening on: http://localhost:${config.bot.port}${config.api.prefix}`);
            
            // Try to access routes from the client's stores
            try {
                const routesStore = client.stores.get('routes');
                if (routesStore) {
                    client.logger.info(`   Total Routes: ${routesStore.size}`);
                    client.logger.info('   Registered Routes:');
                    for (const [name, route] of routesStore.entries()) {
                        const routePath = `${config.api.prefix}/${(route as any).route || name}`;
                        client.logger.info(`      - ${routePath}`);
                    }
                } else {
                    client.logger.warn('   Routes store not found in client.stores');
                }
            } catch (err) {
                client.logger.warn('   Could not access routes store:', err);
            }
            
            // Check if server is actually listening
            if ((server as any).server) {
                const address = (server as any).server.address();
                client.logger.info(`   Server Address: ${JSON.stringify(address)}`);
            }
            
            client.logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } else {
            client.logger.error('❌ API SERVER NOT INITIALIZED!');
        }
    } catch (error) {
        client.logger.fatal(error);
        await client.destroy();
        process.exit(1);
    }
};

void main();
