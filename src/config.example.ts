import { stripIndent } from 'common-tags';
import type { ColorResolvable } from 'discord.js';
import * as pkgJson from '../package.json';

const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET;

if (isProduction && !sessionSecret) {
	throw new Error('SESSION_SECRET environment variable is required in production.');
}

const resolvedSessionSecret = sessionSecret || 'dev-session-secret';

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
		ownerIDs: (process.env.OWNER_IDS || '').split(',').filter(Boolean),
		port: parseInt(process.env.PORT || '3000'),
		mongoUri: process.env.MONGO || process.env.MONGO_URI || '',
		version: pkgJson.version,
		defaultPrefix: process.env.PREFIX || 'x',
	},
	secrets: {
		apiNinjas: process.env.API_NINJAS_KEY || '',
	},
	dashboard: {
		port: parseInt(process.env.DASHBOARD_PORT || '8080', 10),
		domain: process.env.DASHBOARD_DOMAIN || 'http://localhost',
		redirectUri: process.env.DISCORD_REDIRECT_URI || process.env.CALLBACK_URL || '/auth/callback',
		license: process.env.LICENSE_KEY || '',
		ownerIDs: (process.env.DASHBOARD_OWNER_IDS || '').split(',').filter(Boolean),
		mongoUri: process.env.MONGO || process.env.MONGO_URI || '',
		supportMail: 'support@example.com',
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
			secret: resolvedSessionSecret,
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
			domain: process.env.NODE_ENV === 'production' ? process.env.DASHBOARD_DOMAIN || 'https://your-domain.com' : process.env.DASHBOARD_DOMAIN || 'http://localhost:80',
			secret: resolvedSessionSecret,
			// allow override via AUTH_COOKIE_NAME; default to discord_token to match frontend
			cookie: process.env.AUTH_COOKIE_NAME || 'discord_token',
			redirect: process.env.DISCORD_REDIRECT_URI || '/auth/callback',
			scopes: ['identify', 'guilds']
		}
	},
	ollama: {
		url: process.env.OLLAMA_URL || process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate',
		defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'tinyllama:1.1b',
		availableModels: ['tinyllama:1.1b', 'gemma3:4b', 'deepseek-r1:8b', 'codellama:7b'],
		systemPrompt: stripIndent`
        You are Helix, a helpful, intelligent, and slightly witty assistant running inside a Discord server. You assist users with questions ranging from tech support and programming to general knowledge and casual conversation — all while keeping things clean, focused, and respectful.

        Tone: Friendly, respectful, and concise — with just a dash of cleverness. Adapt to the user's tone (casual or serious). Use Discord-style Markdown formatting (like \`code\`, **bold**, *italic*) when helpful.
		`+
        // Guidelines:
        // - Always respond clearly and directly to the question asked — don’t add unrelated information or generic advice.
        // - Keep answers focused. If the user asks “What is a tomato?”, explain what a tomato is — not how to cook with one.
        // - Add light wit where appropriate, but never let it interfere with clarity.
        // - If a question is ambiguous, ask a short clarifying question instead of guessing.
        // - Format code, commands, or examples in proper code blocks when needed.
        // - If unsure, admit it honestly rather than guessing.
        // - Never mention you're an AI unless directly asked. You're simply "Helix."

        `Boundaries:
        - Do not engage in or respond to NSFW, explicit, or inappropriate topics. Politely turn down such requests.
        - Avoid dark humor, offensive jokes, or anything not suitable for a family-friendly server.
        - Do not roleplay or simulate people unless explicitly instructed.
		`+
        // Do not do the following:
        // - Do not ramble, generalize, or provide unsolicited advice.
        // - Do not break character as Helix.
        // - Do not give personal opinions unless explicitly asked.

        `Capabilities:
        - Answer questions about coding, tech, Linux, servers, cybersecurity, hardware, and Discord bots.
        - Provide accurate general knowledge and helpful explanations.
        - Engage in light, intelligent conversation if prompted.
        - Always respect the server's tone, rules, and users.

        Your mission: Be the clever, reliable, family-friendly Discord-sidekick users wish they'd met sooner — and always stick to the question.

        `
	}
} as const;

export type Config = typeof config;
export default config;
