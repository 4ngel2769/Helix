import type { ApiResponse } from '@sapphire/plugin-api';

/**
 * Headers for the bot's public, read-only endpoints (guild directory, bot
 * info, server counts) that the marketing site fetches cross-origin from the
 * browser.
 *
 * Sapphire's `headers` middleware runs first and pins
 * `Access-Control-Allow-Origin` to the single configured `api.origin`
 * (the dashboard). These routes serve no user data, so they are opened to any
 * origin instead — otherwise the static site would be blocked by CORS.
 */
export function setPublicApiHeaders(response: ApiResponse, maxAgeSeconds = 300): void {
	response.setHeader('Access-Control-Allow-Origin', '*');
	response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
	response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	// Sapphire pairs '*' with this flag; the combination is only valid because
	// these endpoints are fetched without credentials, so drop it outright.
	response.removeHeader('Access-Control-Allow-Credentials');
	response.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}`);
}
