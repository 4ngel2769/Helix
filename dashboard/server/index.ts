import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import './dotenv';
import { dashboardConfig, validateDiscordConfig } from './config';
import { avatarUrl, botInviteUrl, exchangeCode, fetchDiscordUser, loginUrl, refreshAccessToken } from './discord';
import { clearSessionCookie, sealSession, sessionCookie, unsealSession, type DashboardSession } from './session';

const DIST_DIR = path
	.normalize(fileURLToPath(new URL('../dist/', import.meta.url)))
	.replace(/[\\/]$/, '');
const STATE_COOKIE = 'helix_oauth_state';

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json', ...extraHeaders }
	});
}

function getCookie(req: Request, name: string): string | null {
	const header = req.headers.get('cookie');
	if (!header) return null;
	for (const part of header.split(';')) {
		const idx = part.indexOf('=');
		if (idx === -1) continue;
		if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
	}
	return null;
}

async function readSession(req: Request): Promise<DashboardSession | null> {
	const raw = getCookie(req, dashboardConfig.session.cookieName);
	if (!raw) return null;
	return unsealSession(raw);
}

/** Refresh the Discord access token when it is expired or about to expire. Returns updated session or null. */
async function withFreshToken(session: DashboardSession): Promise<{ session: DashboardSession; refreshed: boolean } | null> {
	if (session.exp - Date.now() > 60_000) return { session, refreshed: false };
	try {
		const tokens = await refreshAccessToken(session.r);
		const updated: DashboardSession = {
			t: tokens.access_token,
			r: tokens.refresh_token ?? session.r,
			exp: Date.now() + tokens.expires_in * 1000,
			u: session.u
		};
		return { session: updated, refreshed: true };
	} catch {
		return null;
	}
}

function checkOrigin(req: Request): boolean {
	if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return true;
	const origin = req.headers.get('origin');
	if (!origin) return true;
	try {
		return new URL(origin).origin === new URL(dashboardConfig.publicUrl).origin;
	} catch {
		return false;
	}
}

// Simple in-memory rate limiter for the auth endpoints.
const authHits = new Map<string, { count: number; resetAt: number }>();
function authRateLimited(ip: string): boolean {
	const now = Date.now();
	const entry = authHits.get(ip);
	if (!entry || entry.resetAt <= now) {
		authHits.set(ip, { count: 1, resetAt: now + 60_000 });
		return false;
	}
	entry.count += 1;
	return entry.count > 20;
}

function clientIp(req: Request): string {
	return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

async function proxyToBot(req: Request, path: string): Promise<Response> {
	const started = Date.now();
	const session = await readSession(req);
	const target = new URL(dashboardConfig.botApiUrl + path);
	for (const [key, value] of new URL(req.url).searchParams) target.searchParams.set(key, value);

	const headers: Record<string, string> = {};
	const contentType = req.headers.get('content-type');
	if (contentType) headers['content-type'] = contentType;

	// Attach the user's Discord token so the bot API can authorize guild-scoped calls.
	if (session) {
		const fresh = await withFreshToken(session);
		if (fresh) headers.authorization = `Bearer ${fresh.session.t}`;
	}

	let body: string | undefined;
	if (!['GET', 'HEAD'].includes(req.method)) body = await req.text().catch(() => undefined);

	let upstream: Response;
	try {
		upstream = await fetch(target, { method: req.method, headers, body });
	} catch {
		console.warn(`[dashboard] ${req.method} ${path} -> bot unreachable (${Date.now() - started}ms)`);
		return json({ error: 'Bot API unreachable', message: 'The Helix bot API did not respond. Is the bot running?' }, 502);
	}

	const text = await upstream.text().catch(() => '');
	console.log(`[dashboard] ${req.method} ${path} -> ${upstream.status} (${Date.now() - started}ms)`);
	const outHeaders: Record<string, string> = {};
	const upstreamType = upstream.headers.get('content-type');
	if (upstreamType) outHeaders['content-type'] = upstreamType;
	return new Response(text, { status: upstream.status, headers: outHeaders });
}

async function serveStatic(pathname: string): Promise<Response | null> {
	if (pathname.startsWith('/api/')) return null;
	try {
		const requested = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
		const normalized = path.normalize(path.join(DIST_DIR, requested));
		// Prevent path traversal outside dist.
		if (normalized !== DIST_DIR && !normalized.startsWith(DIST_DIR + path.sep)) {
			return new Response('Forbidden', { status: 403 });
		}
		const file = Bun.file(normalized);
		if (await file.exists()) return new Response(file);
		// SPA fallback
		const index = Bun.file(path.join(DIST_DIR, 'index.html'));
		if (await index.exists()) return new Response(index);
		return null;
	} catch {
		return null;
	}
}

const server = Bun.serve({
	port: dashboardConfig.port,
	async fetch(req) {
		const url = new URL(req.url);
		const pathname = url.pathname;

		if (!checkOrigin(req)) return json({ error: 'Forbidden', message: 'Origin check failed' }, 403);

		// ---- Auth ----
		if (pathname === '/api/auth/login') {
			if (authRateLimited(clientIp(req))) return json({ error: 'Too many requests' }, 429);
			if (!dashboardConfig.discord.clientId) return json({ error: 'Discord OAuth not configured' }, 500);
			const state = randomBytes(16).toString('hex');
			const headers = {
				'Set-Cookie': `${STATE_COOKIE}=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300${dashboardConfig.isProduction ? '; Secure' : ''}`,
				Location: loginUrl(state)
			};
			return new Response(null, { status: 302, headers });
		}

		if (pathname === '/api/auth/callback') {
			const code = url.searchParams.get('code');
			const state = url.searchParams.get('state');
			const expected = getCookie(req, STATE_COOKIE);
			if (!code || !state || !expected || state !== expected) {
				return Response.redirect(`${dashboardConfig.publicUrl}/panel?error=oauth_state`, 302);
			}
			try {
				const tokens = await exchangeCode(code);
				const user = await fetchDiscordUser(tokens.access_token);
				const session: DashboardSession = {
					t: tokens.access_token,
					r: tokens.refresh_token,
					exp: Date.now() + tokens.expires_in * 1000,
					u: { id: user.id, username: user.username, avatar: user.avatar }
				};
				const sealed = await sealSession(session);
				// NB: each cookie needs its own Set-Cookie header — combining
				// them with a comma is invalid and browsers drop the session.
				const headers = new Headers();
				headers.append('Set-Cookie', sessionCookie(sealed, 7 * 24 * 3600));
				headers.append('Set-Cookie', `${STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
				headers.set('Location', `${dashboardConfig.publicUrl}/panel`);
				return new Response(null, { status: 302, headers });
			} catch (error) {
				console.error('[dashboard] OAuth callback failed:', error);
				return Response.redirect(`${dashboardConfig.publicUrl}/panel?error=oauth_failed`, 302);
			}
		}

		if (pathname === '/api/auth/logout' && req.method === 'POST') {
			return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
		}

		if (pathname === '/api/me') {
			const session = await readSession(req);
			if (!session) return json({ error: 'Unauthorized' }, 401);
			const fresh = await withFreshToken(session);
			if (!fresh) return json({ error: 'Session expired' }, 401, { 'Set-Cookie': clearSessionCookie() });
			const headers: Record<string, string> = {};
			if (fresh.refreshed) {
				headers['Set-Cookie'] = sessionCookie(await sealSession(fresh.session), 7 * 24 * 3600);
			}
			return json(
				{ user: { ...fresh.session.u, avatarUrl: avatarUrl(fresh.session.u.id, fresh.session.u.avatar) } },
				200,
				headers
			);
		}

		if (pathname === '/api/invite-url') {
			const guildId = url.searchParams.get('guildId') || undefined;
			if (!dashboardConfig.discord.clientId) return json({ error: 'Discord OAuth not configured' }, 500);
			return json({ url: botInviteUrl(guildId) });
		}

		// ---- Bot API proxy ----
		if (pathname === '/api/bot' || pathname.startsWith('/api/bot/')) {
			return proxyToBot(req, pathname.slice('/api/bot'.length) || '/');
		}

		// ---- Static frontend ----
		const staticRes = await serveStatic(pathname);
		if (staticRes) return staticRes;
		if (pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
		return new Response('Dashboard frontend not built. Run `bun run build` in the dashboard folder.', { status: 503 });
	}
});

validateDiscordConfig();
console.log(`[dashboard] listening on http://localhost:${server.port} (public: ${dashboardConfig.publicUrl})`);
console.log(`[dashboard] proxying bot API from ${dashboardConfig.botApiUrl}`);

/** Mini handshake: announce ourselves to the bot (which logs it) and confirm the bot is reachable. */
async function handshake(): Promise<void> {
	for (let attempt = 1; attempt <= 5; attempt += 1) {
		try {
			const res = await fetch(`${dashboardConfig.botApiUrl}/health`, {
				headers: { 'x-helix-dashboard': 'helix-dashboard/1.0.0' }
			});
			if (res.ok) {
				const data = (await res.json().catch(() => null)) as { version?: string; guilds?: number } | null;
				console.log(
					`[dashboard] 🔗 Successfully hooked into bot! (Helix v${data?.version ?? '?'}, ${data?.guilds ?? '?'} guilds)`
				);
				return;
			}
		} catch {
			// bot not up yet — retry below
		}
		if (attempt < 5) await new Promise((r) => setTimeout(r, 3000));
	}
	console.warn(
		`[dashboard] ⚠ Could not reach the bot API at ${dashboardConfig.botApiUrl} — pages will show API errors until the bot is up.`
	);
}

void handshake();
