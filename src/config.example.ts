import { stripIndent } from 'common-tags';
import type { ColorResolvable } from 'discord.js';
import * as pkgJson from '../package.json';

export const config = {
	// Bot runtime values pulled from env
	bot: {
		token: process.env.DISCORD_TOKEN || '',
		client: {
			id: process.env.DISCORD_CLIENT_ID || '',
			secret: process.env.DISCORD_CLIENT_SECRET || ''
		},
		embedColor: {
			err: '#ff0000' as ColorResolvable,
			warn: '#ffff00' as ColorResolvable,
			success: '#00ff00' as ColorResolvable,
			magic: '#9400D3' as ColorResolvable,
			helix: '#3b66ff' as ColorResolvable,
			default: '#3b66ff' as ColorResolvable,
			verification: '#4CAF50' as ColorResolvable
		},
		ownerIDs: [] as string[],
		port: parseInt(process.env.PORT || '3000'),
		mongoUri: process.env.MONGO || process.env.MONGO_URI || '',
		version: pkgJson.version,
		defaultPrefix: process.env.PREFIX || 'x'
	},
	secrets: {
		apiNinjas: process.env.API_NINJAS_KEY || ''
	},
	dashboard: {
		port: parseInt(process.env.DASHBOARD_PORT || '8080', 10),
		domain: process.env.DASHBOARD_DOMAIN || 'http://localhost',
		redirectUri: process.env.DISCORD_REDIRECT_URI || process.env.CALLBACK_URL || '/auth/callback',
		license: '',
		ownerIDs: [] as string[],
		mongoUri: process.env.MONGO || process.env.MONGO_URI || '',
		supportMail: '',
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
			domain:
				process.env.NODE_ENV === 'production'
					? process.env.DASHBOARD_DOMAIN || 'https://your-domain.com'
					: process.env.DASHBOARD_DOMAIN || 'http://localhost:80',
			secret: process.env.SESSION_SECRET || '',
			cookie: process.env.AUTH_COOKIE_NAME || 'discord_token',
			redirect: process.env.DISCORD_REDIRECT_URI || '/auth/callback',
			scopes: ['identify', 'guilds']
		}
	},
	ollama: {
		url: process.env.OLLAMA_URL || process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate',
		defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'tinyllama:1.1b',
		availableModels: ['tinyllama:1.1b'],
		systemPrompt: 
		stripIndent`
			You are an advanced AI assistant integrated into a Discord bot named Helix.
			Your purpose is to help users with their inquiries in a friendly and efficient manner.
			Always aim to provide accurate and concise information, and maintain a helpful tone throughout the conversation.
        `
	}
} as const;

export type Config = typeof config;
export default config;
