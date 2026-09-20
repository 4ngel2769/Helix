function required(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`${name} environment variable is required`);
	return value;
}

function optional(name: string, fallback: string): string {
	return process.env[name] || fallback;
}

export const dashboardConfig = {
	/** Port the dashboard web server listens on. */
	port: parseInt(optional('DASHBOARD_WEB_PORT', '3000'), 10),
	/** Public origin, e.g. https://helixdash.angellabs.xyz (no trailing slash). Used for the OAuth redirect URI. */
	publicUrl: optional('DASHBOARD_WEB_URL', optional('DASHBOARD_DOMAIN', 'http://localhost:3000')).replace(/\/$/, ''),
	/** Main website origin allowed to probe login state (CORS, credentials). No trailing slash. */
	siteUrl: optional('SITE_URL', 'https://helix.pages.dev').replace(/\/$/, ''),
	/** Base URL of the bot HTTP API (prefix /api included), e.g. http://localhost:8080/api */
	botApiUrl: optional('BOT_API_URL', `http://localhost:${optional('DASHBOARD_PORT', '8080')}/api`).replace(/\/$/, ''),
	discord: {
		clientId: optional('DISCORD_CLIENT_ID', ''),
		clientSecret: optional('DISCORD_CLIENT_SECRET', '')
	},
	session: {
		secret: optional('SESSION_SECRET', 'dev-dashboard-secret-change-me'),
		cookieName: optional('DASHBOARD_SESSION_COOKIE', 'helix_dash'),
		// Permissions integer used for bot invite links (default: Administrator).
		invitePermissions: optional('BOT_INVITE_PERMISSIONS', '8')
	},
	/** Discord user IDs treated as bot developers (extra dashboard tabs). */
	devUserIds: (process.env.OWNER_IDS ?? process.env.DASHBOARD_OWNER_IDS ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter((s) => /^\d{16,22}$/.test(s)),
	isProduction: process.env.NODE_ENV === 'production'
};

export function validateDiscordConfig(): void {
	if (!dashboardConfig.discord.clientId || !dashboardConfig.discord.clientSecret) {
		console.warn('[dashboard] DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET missing — Discord login will not work.');
	}
}
