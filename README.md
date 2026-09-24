<img src="./src/db/assets/branding/wave-top4.svg" alt="Helix banner waves">

<h1 align="center">
  <img src="src/db/assets/branding/helix-gh-logo2.png" alt="Helix" width="120px" />
  <br />
  <b>Helix</b>
</h1>

<p align="center"><b>A multipurpose Discord bot for communities of all sizes — moderation, engagement, and automation with a full web dashboard.</b></p>

<div align="center">
  <a href="https://discord.gg/GapmaCt">
    <img src="https://img.shields.io/badge/Discord-%235865F2.svg?style=for-the-badge&logo=discord&logoColor=white" alt="Discord support server" />
  </a>
  <a href="https://bun.sh/">
    <img src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun" />
  </a>
  <br>
  <a href="https://discord.gg/GapmaCt">
    <img src="https://dcbadge.limes.pink/api/server/GapmaCt" alt="Discord member count" />
  </a>
  <br>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/License-GPL--3.0-blue.svg" alt="License: GPL-3.0" />
  </a>
  <img src="https://img.shields.io/badge/discord.js-14.x-5865F2.svg" alt="discord.js v14" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6.svg" alt="TypeScript" />
</div>

## About Helix

Helix helps you run a Discord server: moderate it, welcome new members, verify them, give out self-assignable roles, track activity with detailed audit logs, and keep members engaged with a deep economy system and fun commands. Everything is configurable from Discord commands or the web dashboard — no hosting or code required for server admins.

## ✨ Features

- **Moderation** — bans, kicks, timeouts, mutes, purges, warnings with aliases, configurable DM templates, escalation (warn → timeout/kick/ban), and live moderation actions from the dashboard.
- **Audit logging** — 31 event types across moderation, members, messages, voice, server changes, and AutoMod, with per-event channels and ignore lists.
- **Verification** — button-based gate with a customizable embed; grants a role on verify.
- **Reaction roles** — self-assignable role menus with labels, emoji, per-menu limits, and pause/resume.
- **Welcoming** — welcome/farewell messages with placeholders, auto-role on join, and image cards.
- **Economy** — wallet & bank, shop, inventory & equipment, item effects, auctions, leaderboards, and RPG-style stats.
- **AutoMod** — Discord native AutoMod rules plus custom invite/link, caps, emoji, spam, repeat, spoiler, attachment, and zalgo filters with per-filter delete, warn, timeout, kick, or ban actions.
- **Social feeds** — automatic Reddit feeds per channel (Twitch/YouTube/TikTok/X/Instagram/RSS planned).
- **Fun & utility** — emotion roleplay commands, canvas image effects, pet pics, polls placeholders, 8-ball, memes, and more.
- **Dashboard** — per-server web panel for every setting above, with live Discord-style previews.
- **AI (beta)** — Ollama-powered `ask` command with a family-friendly assistant persona.

## Modules

Module defaults below come from the module catalog in `src/config/modules.ts`. Existing guild records may have older values; `/configmodule` and the dashboard show the stored value for a server.

| Module | What it covers | Catalog default |
|---|---|:---:|
| General | Info commands, help, ping, profiles | ✅ on |
| Moderation | Ban/kick/timeout/mute/purge/warn, AutoMod | ✅ on |
| Administration | Prefix, staff roles, log channels, toggles | ✅ on |
| Verification | Verify gate + setup | ✅ on |
| Welcoming | Welcome/farewell, auto-role, cards | ✅ on |
| Reaction Roles | Role menus | ✅ on |
| Economy | Wallet/bank/shop/inventory/auctions | ✅ on |
| Fun | 8-ball, memes, games, emotion, image, pets | ✅ on |
| Utility | Misc helpers (password, uuid, color…) | ✅ on |
| Developer | Owner-only diagnostics & data tools | ✅ on |
| Music | Voice playback | ✅ on |
| Leveling | XP, ranks, role rewards | ❌ off |

## Version Legend

| Symbol | Meaning |
|:---:|---|
| 🟢 | Active |
| Ⓜ️ | Very active (current focus) |
| 🔵 | Beta |
| ⚪ | Alpha |
| 🟡 | Inactive |
| 🔴 | Discontinued |
| 🟣 | Unofficial / private |
| 🛟 | Life support (security fixes only) |
| ✅ / 🤖 / ❌ | Full / partial / no AI |
| ⚗️ | In progress |

## Versions

| Core | Version(s) | Codename | Status | Engine | AI | Notes |
|---|---|:---:|:---:|---|:---:|---|
| — | v1.0.0 → 1.1.8 | Rootspawn | 🔴 | D.js 12.2.0 | ❌ | |
| — | v2.0.0 → 2.6.0 | Loopback | 🔴 | D.js 12.4.1 | ❌ | |
| — | v3.0.0 → 3.5.0 | EchoRun | 🛟 | D.js 12.5.2 | ❌ | |
| — | v4.0.0 → 4.1.2 | Neatline | 🔴 | D.js 12.5.3 | ❌ | |
| — | v5.0.0 | Ghostping | 🟡 | D.js 13.6.0 | ❌ | |
| — | v5.1.0 | Signalband | 🟢 | D.js 13.11.0 | ❌ | |
| — | v6.0.0 | Dataloom | 🔴 | D.js 13.14.0 | ❌ | |
| — | v6.1.0 | Protothype | 🔵 | D.js 14.9.0 | ✅ | |
| — | v7.0.0 | Cleancut | 🔴 | D.js 14.11.0 | ⚗️ | |
| Hex_1 | v9.0.0 → 9.0.6 | Stackflow | 🔴 | D.js 14.6.0 | ⚗️ | Deprecated in favor of Carbonkernel |
| Hex_2 | v10.0.1 | Carbonkernel | Ⓜ️ | D.js 14.26 | ⚗️ | Current. Sapphire framework + Svelte dashboard + REST API |
| Cranberry | x | Cranberry | 🟣 | D.js 14.14.1 | 🤖 | Private moderation bot for the Helix support server |

> v9.0+ runs on [Paperplane](https://github.com/Helix-Labs/framework), a custom fork of [Sapphire](https://github.com/sapphiredev/framework).

## Documentation & Support

- 🌐 **[Website](https://helix.angellabs.xyz/)**
- ➕ **[Add Helix to your server](https://discord.com/oauth2/authorize?client_id=723697439638290482&scope=bot&permissions=481684598)**
- 💬 **[Support server](https://discord.gg/GapmaCt)** — help, suggestions, and status updates
- 📖 **In-bot help** — `/help` lists commands available to the current member; use `/help command:<name>` for a specific root or grouped command

## Server configuration commands

These commands and the dashboard write to the same per-guild configuration, but they do not expose the same controls:

| Command | What it does | Permission |
|---|---|---|
| `/setup` | Stateful, restart-safe setup wizard for roles, channels, prefix, and module states, with `start`, `status`, `finish`, and `cancel`; `legacy` preserves the one-shot form. It stores verification settings but does not post the verification button. | `Manage Guild` |
| `/help` | Lists commands the member can use. `command:config role admin` and other grouped paths are accepted. | None |
| `/config` | Sets roles, log channels, prefix, module states, or disabled commands through subcommands. | Slash registration: `Administrator`; runtime accepts `Manage Channels`, `Manage Roles`, `Ban Members`, `Kick Members`, or `Moderate Members` for most subcommands. The administrator role is owner-only. |
| `/settings` | Displays the current server configuration; it does not change settings. | `Manage Guild` |
| `/configmodule` | Enables or disables one module. | `Administrator` |
| `/togglecommand` | Enables or disables one non-critical command for the server. | `Manage Guild` |
| `/setup-verification` | Configures and enables verification, validates the selected role/channel, and posts the verification message. | `Manage Guild` and moderator access |

`/setup` is restart-safe: `start` creates the wizard, each step command saves its changes before advancing, and `status`, `finish`, or `cancel` manages the flow. The starter or server owner can continue it; the server owner alone can assign the administrator role. `/setup legacy` preserves the old one-shot form. The dashboard exposes the broader guild configuration API, including warning aliases/DM templates, AutoMod actions, per-event logging channels, and other settings that are not part of `/setup`; dashboard changes are persisted independently of the command form but share the same guild record.

The repository's `bun run typecheck` and `bun run build` provide compile-time validation. `bun run test` is a repository structure/static-validation script, not a live Discord, MongoDB, or permission integration test; it currently reports pre-existing false-positive errors for helper files that do not export command classes. Command registration, database writes, role hierarchy, and permission behavior still require testing in a Discord server.

## Development

Requires [Bun](https://bun.sh/) ≥ 1.3.14 and a MongoDB database.

```bash
bun install          # install bot dependencies
cp src/example.env src/.env  # then fill in DISCORD_TOKEN, MONGO_URI, ...
bun run build        # typecheck + compile to dist/
bun run start        # run the bot
```

Live-reload bot:

```bash
bun run dev
```

### Combined dev (one terminal)

```bash
bun run dev:all
```

Boots the bot first, waits for its API, then boots the dashboard. Bot logs pass through untouched; dashboard lines are re-tagged `TIMESTAMP - DASH - …` (magenta). `Ctrl+C` stops everything.

To delete both `dist/` folders, rebuild the bot and dashboard from clean, then launch both (so a broken compile fails before anything starts):

```bash
bun run dev:fresh
```

### Dashboard (Svelte 5 + Bun)

The web dashboard lives in `dashboard/` — a Svelte SPA served by a Bun server that handles Discord login and proxies the bot API.

```bash
bun run dashboard:install   # install dashboard deps
bun run dashboard:dev       # dev: Vite (5173) + Bun server (3000)
bun run dashboard:build     # production frontend build
bun run dashboard:start     # serve production build
```

Configure via `DASHBOARD_WEB_PORT`, `DASHBOARD_WEB_URL` (e.g. `https://dash.domain.tld`), `BOT_API_URL`, plus `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` / `SESSION_SECRET`. Register `{DASHBOARD_WEB_URL}/api/auth/callback` as an OAuth2 redirect in the Discord developer portal. See `dashboard/README.md`.

Other useful scripts: `bun run validate` (pre-commit checks), `bun run test`, `bun run create-module` / `delete-module` (scaffold toggleable modules).

## Credits

- [Sapphire framework](https://github.com/sapphiredev/framework) — bot architecture, MIT
- [Paperplane](https://github.com/Helix-Labs/framework) — Helix's Sapphire fork
- [discord.js](https://discord.js.org/) — Discord API library
- [Svelte](https://svelte.dev/) — dashboard UI

## License

GPL-3.0 — see [LICENSE](./LICENSE).

## ⭐ Star History

<a href="https://www.star-history.com/#4ngel2769/Helix&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=4ngel2769/Helix&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=4ngel2769/Helix&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=4ngel2769/Helix&type=Date" />
  </picture>
</a>
