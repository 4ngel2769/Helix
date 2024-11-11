import './lib/setup';
import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits, OAuth2Scopes, Partials } from 'discord.js';
import '@sapphire/plugin-api/register';
import '@kbotdev/plugin-modules/register';
import config from './config';

const client = new SapphireClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel],
    modules: {
        directory: './src/modules',
        defaultEnabled: true
    },
    api: {
        auth: {
            id: config.dashboard.oauth.clientId,
            secret: config.dashboard.oauth.clientSecret,
            cookie: 'SAPPHIRE_AUTH',
            redirect: config.dashboard.redirectUri,
            scopes: [OAuth2Scopes.Identify, OAuth2Scopes.Guilds],
            domainOverwrite: config.dashboard.domain,
            transformers: [{
                parse: (data) => ({
                    ...data,
                    guilds: data.guilds
                })
            }]
        },
        prefix: '/api',
        mode: 'production',
        origin: config.dashboard.domain,
        listenOptions: {
            port: config.dashboard.port
        }
    }
});

const main = async () => {
    try {
        await client.login();
        client.logger.info('Logged in');
    } catch (error) {
        client.logger.fatal(error);
        await client.destroy();
        process.exit(1);
    }
};

void main();
