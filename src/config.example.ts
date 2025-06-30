import { stripIndent } from 'common-tags';
import * as pkgJson from '../package.json';

const config = {
	bot: {
		token: process.env.TOKEN || '',
		client: {
			id: process.env.DISCORD_CLIENT_ID || '',
			secret: process.env.DISCORD_CLIENT_SECRET || ''
		},
		embedColor: {
			err: '#ff0000',
			warn: '#ffff00',
			success: '#00ff00',
			magic: '#9400D3',
			helix: '#3b66ff',
			default: '#3b66ff'
		},
		ownerIDs: ['', ''],
		port: parseInt(process.env.PORT || '3000'),
		mongoUri: process.env.MONGO || '',
		version: pkgJson.version
	},
	secrets: {
		apiNinjas: 'YOUR_API_NINJAS_KEY'
	},
	dashboard: {
		port: 8080,
		domain: 'http://localhost',
		redirectUri: '/auth/callback',
		license: '', // not needed
		ownerIDs: ['', ''],
		mongoUri: process.env.MONGO || '',
		supportMail: 'support@yourwebsite.com',
		ui: {
			darkLogo: './src/db/assets/branding/Helix 000.png',
			lightLogo: './src/db/assets/branding/Helix 000.png',
			preload: './src/db/assets/branding/logo.png'
		},
		oauth: {
			clientId: process.env.DISCORD_CLIENT_ID || '',
			clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
			scopes: ['identify', 'guilds', 'guilds.join'],
			prompt: 'consent'
		},
		session: {
			secret: process.env.SESSION_SECRET || 'your-secure-session-secret',
			name: 'helix.session',
			saveUninitialized: false,
			resave: false,
			cookie: {
				maxAge: 60000 * 60 * 24, // 24 hours
				secure: process.env.NODE_ENV === 'production'
			}
		}
	},
	api: {
		port: 80,
		origin: process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:80',
		prefix: '/api',
		auth: {
			domain: process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:80',
			secret: process.env.SESSION_SECRET || 'your-secure-session-secret',
			cookie: 'SAPPHIRE_AUTH',
			redirect: '/auth/callback',
			scopes: ['identify', 'guilds']
		}
	},
	ollama: {
		url: process.env.OLLAMA_URL || 'http(s)://ollama-api-hostname:port/api/generate',
		defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'ollama-model-name',
		availableModels: ['model1', 'model2', 'model3', 'model4'],
		systemPrompt: stripIndent`
        This is your ollama system prompt.
        `
	}
};

export default config;

module.exports = config;
export type Config = typeof config;
