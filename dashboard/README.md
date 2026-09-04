# Helix Dashboard

Fresh Svelte 5 + Bun dashboard for the Helix Discord bot. Sharp, minimal, high-contrast UI with a sidebar per server.

**URLs:** `/panel` (server list) → `/panel/guilds/{guildId}/dashboard` (overview) plus one page per settings area: `general`, `modules`, `logging`, `welcome`, `verification`, `automod`, `moderation`, `reaction-roles`, `messages`. `/` redirects to `/panel`.

## Architecture

```
browser ──► Bun server (:3000) ──► bot API (:8080/api)
   │              │
   │              ├── /api/auth/*  Discord OAuth2 login, JWE session cookie
   │              ├── /api/me      current Discord user
   │              ├── /api/invite-url
   │              ├── /api/bot/*   proxy → bot API (attaches user's Bearer token)
   │              └── /*           built Svelte SPA (history-mode fallback)
   └── Svelte 5 SPA (Vite build → dist/)
```

All guild settings pages talk to the bot's REST API (`src/routes/api/*`), so the dashboard never touches the database directly.

## Setup

```bash
bun install        # in dashboard/
bun run build      # build the SPA into dist/
bun run start      # serve production (Bun)
```

Dev (two processes, or `bun run dev` for both):

```bash
bun run dev:web      # Vite on :5173, proxies /api → :3000
bun run dev:server   # Bun --hot server/index.ts on :3000
```

## Environment

Secrets are reused from the bot's `src/.env` automatically (same `@skyra/env-utilities` loader the bot uses).
Precedence: real environment > `dashboard/.env` > `src/.env` > built-in defaults — so you only need
`dashboard/.env` for dashboard-specific overrides.

| Var | Default | Purpose |
|---|---|---|
| `DASHBOARD_WEB_PORT` | `3000` | Dashboard listen port |
| `DASHBOARD_WEB_URL` | `DASHBOARD_DOMAIN` or `http://localhost:3000` | Public origin, e.g. `https://dash.domain.tld` |
| `BOT_API_URL` | `http://localhost:{DASHBOARD_PORT}/api` | Bot HTTP API base |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | — | OAuth app (same app as the bot) |
| `SESSION_SECRET` | — | Key for the session cookie (required in prod-style setups) |
| `BOT_INVITE_PERMISSIONS` | `8` | Permissions integer for invite links |
| `NODE_ENV=production` | — | Enables `Secure` cookies |

**Discord portal:** add `{DASHBOARD_WEB_URL}/api/auth/callback` to the app's OAuth2 redirects (multiple redirects are allowed alongside the bot's own). Scopes used: `identify guilds`.

**Reverse proxy** (`dash.domain.tld`): terminate TLS at nginx/Caddy and proxy `/` to `127.0.0.1:3000`. Example (Caddy):

```
dash.domain.tld {
	reverse_proxy 127.0.0.1:3000
}
```

## Auth model

Login exchanges the OAuth code, fetches `/users/@me`, and stores `{access_token, refresh_token, exp, user}` in an `HttpOnly + SameSite=Lax` JWE cookie. Tokens auto-refresh server-side. The proxy forwards the user's token as `Authorization: Bearer …` so the bot API's `MANAGE_GUILD` checks apply unchanged.

## Scripts

| Script | What |
|---|---|
| `bun run dev` | web + server together |
| `bun run build` | `vite build` → `dist/` |
| `bun run typecheck` | `svelte-check` (0 errors, 0 warnings) |
| `bun run start` | `bun server/index.ts` (serves `dist/`) |
