# Helix MCP server

Exposes the Helix Discord bot HTTP API as [Model Context Protocol](https://modelcontextprotocol.io/) tools, so AI agents (OpenCode, Claude Code, Cursor, …) can inspect and manage the bot, servers, economy and moderation.

25 tools: `helix_health`, `helix_stats`, `helix_commands`, `helix_modules`, `helix_public_guilds`, `helix_my_guilds`, `helix_guild`, `helix_guild_config_get/update`, `helix_guild_modules_get/set`, `helix_user_economy`, `helix_leaderboard`, `helix_shop_search`, `helix_auctions`, `helix_warnings_list`, `helix_warning_create/clear`, `helix_moderate`, `helix_reaction_roles_list`, `helix_reaction_role_create/update/delete`, `helix_messages_get/update`.

## Prerequisites

1. The bot running with the API enabled (default `DASHBOARD_PORT=8080`, API prefix `/api`).
2. Dependencies installed: `bun install` (or `npm install`) in this folder.
3. Built once: `bun run build` → `mcp/dist/index.js`.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `HELIX_API_URL` | `http://localhost:8080/api` | Bot API base URL |
| `HELIX_DISCORD_TOKEN` | — | Default Discord **user** OAuth2 access token (`identify` + `guilds` scopes) for authenticated tools. Each tool also accepts a `discordToken` param that overrides it. Mutating guild tools additionally require the token owner to have **MANAGE_GUILD** in that server. |

Getting a user token: complete the Discord OAuth2 flow against the bot's `POST /api/oauth/callback` (same flow the dashboard uses) and use the returned `access_token`.

## Run standalone

```bash
node ./dist/index.js   # stdio MCP server
```

## Add to OpenCode

**Option A — project config (recommended, already in repo root):**
`opencode.jsonc` in the Helix repo root registers the server automatically whenever you open this project in OpenCode. Just make sure `mcp/dist/index.js` is built.

```jsonc
{
	"$schema": "https://opencode.ai/config.json",
	"mcp": {
		"helix": {
			"type": "local",
			"command": ["node", "mcp/dist/index.js"],
			"environment": { "HELIX_API_URL": "http://localhost:8080/api" },
			"enabled": true
		}
	}
}
```

**Option B — global config** (`~/.config/opencode/opencode.jsonc`), works in every project:

```jsonc
{
	"$schema": "https://opencode.ai/config.json",
	"mcp": {
		"helix": {
			"type": "local",
			"command": ["node", "C:/Users/Manu/Documents/GitHub/Helix/mcp/dist/index.js"],
			"environment": {
				"HELIX_API_URL": "http://localhost:8080/api",
				"HELIX_DISCORD_TOKEN": "YOUR_DISCORD_OAUTH_TOKEN"
			},
			"enabled": true
		}
	}
}
```

Then verify: `opencode mcp list`, and prompt with `use the helix tool …`.
