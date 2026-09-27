# Dashboard

The dashboard is a SvelteKit single-page app in `dashboard/`, served by a standalone Bun server (`dashboard/server/index.ts`) from the built `dist/` folder. It is a pure front end for the bot's HTTP API: every page calls the bot's `src/routes/api/*` routes through the `/api/bot/*` reverse proxy, which injects the signed-in user's Discord OAuth access token as a `Bearer` header so the bot can authorize guild-scoped calls. Auth is Discord OAuth2 with `identify` + `guilds` scopes only (`/api/auth/login` to `/api/auth/callback`), sealed into an `HttpOnly` JWE session cookie (`helix_dash`, 7 days, `SameSite=None; Secure` in production). Every guild-scoped endpoint requires the caller to be a Discord member of the guild with **Manage Server**, and the bot to be present in it (`requireManageableGuild`, `src/lib/utils/apiAuth.ts:170`); the three `/panel/dev/*` pages additionally require the user id to appear in `OWNER_IDS` / `DASHBOARD_OWNER_IDS`. There are no `+page.server.ts` / `+page.ts` load functions and no SvelteKit server routes: the SPA hand-rolls routing in `dashboard/src/App.svelte` and `dashboard/src/lib/router.svelte.ts`, and all data comes from client-side `fetch`.

## Summary

| Page | Route | Access | Options | File |
|---|---|---|---|---|
| Servers | `/panel` | Any logged-in user | 1 action, 8 read-only fields | `dashboard/src/pages/Servers.svelte` |
| My data | `/panel/me` | Any logged-in user | 0 (read-only, 13 fields) | `dashboard/src/pages/MyData.svelte` |
| Economy | `/panel/economy` | Any logged-in user | 3 query controls | `dashboard/src/pages/Economy.svelte` |
| Guild layout | `/panel/guilds/:guildId/:section` | Manage Server + bot present | 0 (nav shell, 12 sections) | `dashboard/src/pages/GuildLayout.svelte` |
| Overview | `/panel/guilds/:id/dashboard` | Manage Server + bot present | 0 (read-only, 8 fields) | `dashboard/src/pages/guild/Overview.svelte` |
| General | `/panel/guilds/:id/general` | Manage Server + bot present | 6 | `dashboard/src/pages/guild/General.svelte` |
| Modules | `/panel/guilds/:id/modules` | Manage Server + bot present | 12 module toggles | `dashboard/src/pages/guild/Modules.svelte` |
| Logging | `/panel/guilds/:id/logging` | Manage Server + bot present | 4 + 31 event toggles + 31 channel overrides + 6 legacy + 3 ignore lists | `dashboard/src/pages/guild/Logging.svelte` |
| Welcome | `/panel/guilds/:id/welcome` | Manage Server + bot present | 4 message fields + 2 cards x 9 | `dashboard/src/pages/guild/Welcome.svelte` |
| Verification | `/panel/guilds/:id/verification` | Manage Server + bot present | 7 | `dashboard/src/pages/guild/Verification.svelte` |
| AutoMod | `/panel/guilds/:id/automod` | Manage Server + bot present | 4 keyword lists + 20 Helix filter settings + 9 per-filter actions + scope overrides + 3 presets + rule delete | `dashboard/src/pages/guild/Automod.svelte` |
| Leveling | `/panel/guilds/:id/leveling` | Manage Server + bot present | 10 | `dashboard/src/pages/guild/Leveling.svelte` |
| Moderation | `/panel/guilds/:id/moderation` | Manage Server + bot present | 5 warn settings + threshold array + 4 live-action fields | `dashboard/src/pages/guild/Moderation.svelte` |
| Reaction Roles | `/panel/guilds/:id/reaction-roles` | Manage Server + bot present | 7 menu fields + per-role 3 | `dashboard/src/pages/guild/ReactionRoles.svelte` |
| Reddit Feeds | `/panel/guilds/:id/reddit-feeds` | Manage Server + bot present | 3 create fields + 2 per-feed actions | `dashboard/src/pages/guild/RedditFeeds.svelte` |
| Messages | `/panel/guilds/:id/messages` | Manage Server + bot present | 2 | `dashboard/src/pages/guild/Messages.svelte` |
| Bot servers | `/panel/dev/guilds` | `OWNER_IDS` only | 4 filters + 6 patch fields + 2 actions + 3 editors | `dashboard/src/pages/dev/DevGuilds.svelte` |
| Bot users | `/panel/dev/users` | `OWNER_IDS` only | 4 filters + 5 patch fields + 2 editors | `dashboard/src/pages/dev/DevUsers.svelte` |
| Bot stats | `/panel/dev/stats` | `OWNER_IDS` only | 0 (read-only, 12 fields) | `dashboard/src/pages/dev/DevStats.svelte` |

## Column legend

| Column | Meaning |
|---|---|
| Option | The exact persisted field name (Guild model field, or API body key) in backticks. UI-only controls (search boxes, filters, buttons) are labelled as such. |
| Type | TypeScript/JSON type as accepted by the API. `string \| null` means the UI sends `null` to clear the value. |
| Default | Effective default when the field is absent. Two sources exist and they can differ: the **UI** default (what the form falls back to) and the **DB/API** default. Where they differ it is called out. |
| Saved to | The route + method that persists it, or `—` for read-only / client-side-only. |
| Validation / notes | Real server-side rules (min/max, enums, snowflake shape, channel-type limits, caps) plus gotchas. |

### Shared behaviour

`dashboard/src/lib/sanitize.ts` mirrors the server sanitizer and strips control characters (C0/C1), zero-width/BOM/soft-hyphen, and bidi overrides from every string in a request body before sending. The same file declares a `MAX` map (`prefix: 5`, `short: 100`, `title: 256`, `message: 2000`, `reason: 1000`, `userIds: 32`) — that map is a documentation constant only, not enforced at runtime. All requests go through `api()` / `apiBlob()` in `dashboard/src/lib/api.ts`, which prefix `/api/bot`, attach `content-type: application/json`, run a 20 s `AbortController` timeout, and throw `ApiError` on non-2xx. `loadGuild()` (`lib/session.svelte.ts:81`) caches `GET /guilds/:id` + `GET /guilds/:id/config` per guild and retries once after a Discord 429 using the response's `retryAfterMs` (clamped 500 to 10 000 ms).

---

## User pages

### Servers — pick which server to configure, or invite the bot

`Servers.svelte` filters `/me/guilds` down to entries with `canManage === true` and splits them into "With Helix" (`hasBot === true`) and "Add Helix" (`hasBot === false`).

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `?error=` query string | read-only | — | — | `Servers.svelte:15` reads it off the URL and renders it on the login card after a failed OAuth. Not a setting. |
| `+ Add to a server` | button | — | `GET /api/invite-url` | Dashboard-server only. Returns `{ url }`; opens in a new tab. `BOT_INVITE_PERMISSIONS` defaults to `8` (Administrator). |
| Per-guild `Add` | button | — | `GET /api/invite-url?guildId=<id>` | Scopes the OAuth invite to one guild. |
| `id`, `name`, `icon` | read-only | — | — | `icon` falls back to a generated SVG initial when null (`lib/utils.ts:3`). |
| `owner` | read-only | — | — | Discord `owner` flag from the OAuth payload. |
| `permissions` | read-only | — | — | Permission bitfield as a decimal string. |
| `canManage` | read-only | — | — | `true` if owner, else the `MANAGE_GUILD` bit is set. Not a read-only control: it gates the whole list. |
| `hasBot` | read-only | — | — | `true` when the id is in the bot's guild cache. Drives which card list a guild appears in. |
| `approximate_member_count` | read-only | — | — | Optional in the type; the route never returns it, so the member count never renders. |

API: `GET /api/bot/me/guilds` returns `{ total, manageable, guilds, manageableGuilds }`.

### My data — read-only self view

No control on this page mutates anything. `GET /api/bot/me/data`.

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| Coins (total) | read-only number | `0` | — | `wallet + bank`. |
| Level | read-only number | `1` | — | From `economy.level`. |
| Active warnings | read-only number | `0` | — | Warnings with `active === true`, across all guilds. |
| Items | read-only number | `0` | — | `inventory.length`. |
| `wallet` | read-only number | `0` | — | — |
| `bank` / `bankLimit` | read-only number | `0` / `0` | — | Rendered as `bank / bankLimit`. |
| `experience` | read-only number | `0` | — | — |
| `dailyStreak` | read-only number | `0` | — | — |
| `publicProfile` | read-only boolean | `true` | — | `economy.settings.publicProfile`; when `false`, other users' economy views are redacted to identity + level. |
| `achievements[]` | read-only string[] | `[]` | — | Rendered as a comma list, or "None yet". |
| `warnings[]` | read-only | `[]` | — | `{ guildId, guildName, reason, moderatorTag, timestamp, active }`; `guildName` is `null` when the bot is not in that guild, and the page falls back to the raw `guildId`. |
| `servers.known[]`, `servers.lastSeen`, `servers.firstSeen` | read-only | `[]` / `null` / `null` | — | Mapped from `joinedServers`, `lastSeen`, `createdAt`. |
| `isDeveloper` | read-only boolean | `false` | — | Server-side `OWNER_IDS` membership. |
| `hasData` | read-only boolean | — | — | `false` shows the empty state; `economy`, `inventory`, `equipment` and `stats` are absent from the response in that case. |

### Economy — public leaderboard, item catalog and auction house

Fully read-only. Three independent query controls, each firing its own request on mount and on change.

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `type` (Ranked by) | enum `total \| wallet \| bank \| level` | `total` | `GET /economy/leaderboard?type=&limit=25` | Server 400s for anything else. `limit` clamped 1–100; the page always sends `25`. `allowNone={false}`, so there is no "none" option. |
| `search` (Shop catalog) | string | `''` | `GET /economy/items?search=&limit=25&shopOnly=false` | Server: non-empty and ≤64 chars, else 400. Regex-escaped, case-insensitive match on `name`. `shopOnly` is only truthy when the string is exactly `"true"`, so `false` means "include non-shop items". The page never paginates and always sends `limit=25`. |
| `status` (Active auctions) | fixed `active` | `active` | `GET /auctions?status=active&limit=25` | Server also accepts `completed`, `cancelled`, `expired`, plus optional `guildId`/`sellerId` snowflakes. The page hard-codes `status=active`; there is no status control. |
| `rank`, `username`, `wallet`, `bank`, `total`, `level`, `experience` | read-only | — | — | The table renders `#`, `User`, `Total`, `Level` only. |
| `itemId`, `name`, `description`, `rarity`, `basePrice`, `shop.price`, `shop.available` | read-only | — | — | Price column is `shop.price ?? basePrice ?? '—'`. Rarity renders as `—` when absent. |
| `auctionId`, `itemName`, `itemId`, `startingBid`, `currentBid`, `status`, `endTime` | read-only | — | — | Item cell falls back `itemName ?? itemId ?? auctionId`; bid falls back `currentBid ?? startingBid`; `endTime` is rendered as the raw ISO string, not formatted. |

All three routes are unauthenticated; the page still requires a login to render.
---

## Guild settings

`GuildLayout.svelte` is a shell: it calls `loadGuild(guildId)`, which fires `GET /guilds/:id` and `GET /guilds/:id/config` in parallel, caches both in `guildCache`, and renders one of 12 sections from the `:section` path segment. Sections: `dashboard`, `general`, `modules`, `logging`, `welcome`, `verification`, `automod`, `leveling`, `moderation`, `reaction-roles`, `reddit-feeds`, `messages`. An unknown segment renders "Unknown section".

All guild config writes go through one route: `PATCH /api/bot/guilds/:guildId/config` (`src/routes/api/guild-config.ts`), with a 38-field whitelist (`UPDATABLE_FIELDS`, lines 25–65). Any key not on that list is silently dropped; a body with no whitelisted key returns 400. The response is `{ guildId, updated, config }` and the page replaces its cache entry from it.

Two server-wide rules apply to every config write:

- **Snowflake rule** (`guild-config.ts:99-106`): every whitelisted field ending in `Id` must be `null` or a string matching `/^\d{16,22}$/`.
- **Role rule** (`guild-config.ts:236-243`): `adminRoleId`, `modRoleId`, `muteRoleId` and `autoroleId` are rejected with 400 if they are the `@everyone` role or a `managed` (bot/integration) role. There is **no hierarchy check** — a role above the bot's highest position is accepted here and Discord will reject the grant at runtime.

### Overview — read-only state summary

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `memberCount` | read-only number | — | `GET /guilds/:id` | — |
| Text channels | read-only count | `—` | `GET /guilds/:id` | Counts `GuildText` **and** `GuildAnnouncement` channels, capped at 200, sorted by name. Labelled "Text channels" but includes announcement channels. |
| Roles | read-only count | `—` | `GET /guilds/:id` | All roles including `@everyone`, sorted by position desc, capped at 200. |
| Modules on | read-only `n/m` | — | `GET /guilds/:id` | `m` is the key count of `config.modules`. |
| `prefix` | read-only string | — | `GET /guilds/:id` | Shows `(custom)` when set, otherwise `detail.defaultPrefix` labelled `(default)`. |
| `welcomeChannelId` | read-only snowflake | `null` | `GET /guilds/:id` | Resolved to `#name` against the cached channel list, else the raw id, else "Not set up". |
| `modLogChannelId` | read-only snowflake | `null` | `GET /guilds/:id` | The legacy mod-log channel, not `logChannelId`. |
| `verificationChannelId` | read-only snowflake | `null` | `GET /guilds/:id` | Rendered only as Enabled / Not set up. |
| Quick actions | links | — | — | Navigate to `general`, `modules`, `moderation`. |

### General — prefix, staff roles, auto-role, per-command toggles

`SaveBar` at the bottom; `save()` sends a single PATCH containing only these six keys.

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `prefix` | `string \| null` | UI `''` which sends `null` | `PATCH /guilds/:id/config` | `TextInput maxlength={5}`, hint "1–5 characters. Empty means the bot default (x)". Server (`guild-config.ts:87`): `null` or a string of **1–5** chars — `""` is rejected, so the page converts empty to `null`. The bot default comes from `client.options.defaultPrefix` (first entry if an array), else `x`. A successful write updates the prefix cache. |
| `adminRoleId` | `string \| null` | `null` | `PATCH /guilds/:id/config` | `SearchPicker` over all guild roles. Rejects `@everyone` and managed roles. Members holding it bypass AutoMod and pass `ModeratorOnly`. |
| `modRoleId` | `string \| null` | `null` | `PATCH /guilds/:id/config` | Same role rules. Members holding it bypass AutoMod. |
| `muteRoleId` | `string \| null` | `null` | `PATCH /guilds/:id/config` | Same role rules. |
| `autoroleId` | `string \| null` | `null` | `PATCH /guilds/:id/config` | Same role rules. Granted to every new member. |
| `disabledCommands` | `string[]` | `[]` | `PATCH /guilds/:id/config` | Array of ≤500 strings, each ≤64 chars. The server **lowercases every entry** (`guild-config.ts:96`), so the stored value can differ from what was sent. The list comes from the unauthenticated `GET /commands`, grouped by `category` with an `"Other"` fallback bucket, plus per-command checkboxes, a per-category Disable all / Enable all button, and a client-side search over name + description. A failed command fetch is swallowed (`General.svelte:106`) and shows "Command list unavailable". |

Whole feature areas are toggled on the Modules page instead; the page links there rather than duplicating the control.

### Modules — Sapphire module on/off

Each toggle saves immediately via `PATCH`, with optimistic UI that rolls back on error. The toggle list is server-driven, not hard-coded.

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `modules.<key>` | boolean | `cfg.defaultEnabled` from `src/config/modules.ts` | `PATCH /guilds/:id/modules` body `{ modules: { [key]: boolean } }` | Unknown keys 400 with the valid list; non-boolean values 400. Only the keys in the body are `$set`; the rest of the map is untouched. Clears the guild-automation cache. |
| `general` | boolean | `true` | same | "Basic commands for everyone" |
| `moderation` | boolean | `true` | same | "Tools to moderate your server" |
| `administration` | boolean | `true` | same | "Server and bot administration commands" |
| `fun` | boolean | `true` | same | "Fun commands to liven up your server" — Reddit Feeds only run while this is on. |
| `welcoming` | boolean | `true` | same | "Welcome new members to your server" |
| `verification` | boolean | `true` | same | "Verify new members before they can access your server" |
| `utility` | boolean | `true` | same | "Helpful utility commands" |
| `music` | boolean | `true` | same | "Play music in voice channels" |
| `leveling` | boolean | `false` | same | "XP and level tracking system" — the only module off by default. |
| `developer` | boolean | `true` | same | "Commands for bot developers" |
| `reactionRoles` | boolean | `true` | same | "Assign roles based on reactions" |
| `economy` | boolean | `true` | same | "Economy module! (Very cool)" |

`GET /guilds/:id/modules` merges stored state over the catalog: `enabled: data.modules?.[key] ?? cfg.defaultEnabled`. The `emoji` field exists in `src/config/modules.ts` and is exposed by the public `GET /modules` route, but is **not** returned by `GET /guilds/:id/modules`, so the dashboard never shows module emojis. The module key is `reactionRoles` (camelCase), not `reaction_roles`.

### Logging — 31 event toggles, per-event channels, ignore lists

One PATCH writes 12 keys at once. All 31 event keys and their default states are hard-coded in `Logging.svelte:12-56` as a mirror of `src/lib/logging/logEvents.ts`.

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `logChannelId` | `string \| null` | `null` | `PATCH /guilds/:id/config` | Snowflake or `null`. "Events without a per-event or fallback channel are skipped." |
| `logIncludeBots` | boolean | `false` | same | Must be a boolean (`guild-config.ts:166`). Described in the UI as "Include bot messages and bot join/leave events." |
| `logEvents` | `Record<string, boolean>` | per-event defaults below | same | Server: plain object; every key must exist in `LOG_EVENT_KEYS` (unknown key 400s) and every value must be a boolean. The page always sends all 31 keys, so a key added server-side later is simply absent — the server tolerates a partial object. |
| `logEventChannels` | `Record<string, string>` | `''` per event | same | Server: plain object; every key must be in `LOG_EVENT_KEYS`, every value `''` or a snowflake. A per-event override wins over the legacy fallback channels and over `logChannelId`. |
| `logIgnoredChannels` | `string[]` | `[]` | same | Array of ≤500 snowflakes, deduped by the server. A single non-snowflake entry fails the whole save. |
| `logIgnoredRoles` | `string[]` | `[]` | same | Same cap and snowflake rule. |
| `logIgnoredUsers` | `string[]` | `[]` | same | Same cap and snowflake rule. The UI is a single free-text comma-separated box with no `maxlength` and no client-side validation, so one typo fails the entire Logging save. |
| `modLogChannelId` | `string \| null` | `null` | same | Legacy fallback for moderation events (`mod.*` and `automod.action`) without an override. |
| `memberLogChannelId` | `string \| null` | `null` | same | Legacy fallback for `member.join`, `member.leave`, `member.boost`. |
| `messageEditLogChannelId` | `string \| null` | `null` | same | Legacy fallback for `message.edit`. |
| `messageDeleteLogChannelId` | `string \| null` | `null` | same | Legacy fallback for `message.delete` and `message.bulkDelete`. |
| `nicknameLogChannelId` | `string \| null` | `null` | same | Legacy fallback for `member.nickname`. |
| `roleLogChannelId` | `string \| null` | `null` | same | Legacy fallback for `member.roles`. |

**Event keys and their defaults** (the page header says "toggle 31 event types", which matches):

| Group | Keys |
|---|---|
| Moderation | `mod.ban`: true, `mod.unban`: true, `mod.kick`: true, `mod.timeout`: true, `mod.untimeout`: false, `mod.mute`: true, `mod.unmute`: false, `mod.warn`: true, `mod.purge`: true |
| Members | `member.join`: false, `member.leave`: false, `member.nickname`: true, `member.roles`: true, `member.boost`: true |
| Messages | `message.edit`: true, `message.delete`: true, `message.bulkDelete`: true |
| Voice | `voice.join`: false, `voice.leave`: false, `voice.move`: false |
| Server | `channel.create`: true, `channel.delete`: true, `channel.update`: false, `role.create`: true, `role.delete`: true, `role.update`: false, `emoji.update`: false, `invite.create`: false, `invite.delete`: false, `thread.update`: false |
| AutoMod | `automod.action`: true |

Each group has "All on" / "All off" buttons. The ignore lists are checkbox grids over the cached channels/roles with a client-side name search. The legacy fallback block is explicitly labelled "Old per-category channels ... keep them or migrate to the default channel above."
### Welcome — welcome/farewell messages and image cards

Two independent halves. Message placeholders are `{{...}}` and are rendered by `renderMessageTemplate` (`src/lib/utils/messagePlaceholders.ts:35`): `{{user.mention}}`, `{{user.name}}`, `{{user.tag}}`, `{{prefix}}`, `{{server.name}}`, `{{server.members}}`, `{{server.ordinal}}`, plus the legacy `{user}`, `{server}`, `{memberCount}`.

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `welcomeChannelId` | `string \| null` | `null` | `PATCH /guilds/:id/config` | Snowflake or `null`. Empty disables the welcome message. The picker lists `GuildText` + `GuildAnnouncement` channels only. |
| `welcomeMessage` | `string \| null` | `null` | same | `TextArea maxlength={2000}`; server cap 2000 (`guild-config.ts:124`). `null`/empty means the bot default `Welcome {{user.mention}} to **{{server.name}}**! You are member #{{server.members}}.` The "Use default" button writes that literal string into the field rather than clearing it. |
| `farewellChannelId` | `string \| null` | `null` | same | Snowflake or `null`. Empty disables the farewell message. |
| `farewellMessage` | `string \| null` | `null` | same | 2000 chars. Default `**{{user.name}}** has left {{server.name}}.` |

**Card options** — `welcomeCard` and `farewellCard` have identical shapes, validated by `validateGreetCard` (`src/lib/cards/cardValidation.ts`). Each row is a nested field inside the card object.

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `enabled` | boolean | `false` | inside the card object | Required boolean. When `false` the rest of the card UI is hidden and no preview is requested. |
| `background` | enum | `midnight` | same | Must be one of the 12 keys below. Selecting `mono` auto-sets `textColor` to `#111111`; every other background auto-sets `#ffffff`. |
| `layout` | enum `left \| center \| right` | `left` | same | Anything else falls back to `left` on read; the server rejects other values. |
| `showName` | boolean | `true` | same | Required boolean. |
| `line1` | string | welcome `User {{user.name}} is the {{server.ordinal}} member!`, farewell `Goodbye {{user.name}}!` | same | `TextInput maxlength={140}`; server cap 140, trimmed, may be empty. |
| `line1Enabled` | boolean | `true` | same | Required boolean. The line 1 input is hidden when false. |
| `line2` | string | welcome `Welcome to {{server.name}}`, farewell `{{user.name}} has left {{server.name}}` | same | `TextInput maxlength={140}`; server cap 140. |
| `line2Enabled` | boolean | `true` | same | Required boolean. The line 2 input is hidden when false. |
| `textColor` | `#rrggbb` string | `#ffffff` | same | Must match `/^#[0-9a-f]{6}$/i`. 8 preset swatches plus a free `<input type="color">`. A local WCAG contrast check against the background's base color warns below 3:1 and says the bot will fall back to a readable color, but the value is still saved as-is. |

Backgrounds (`key` / label / premium): `midnight`, `ocean`, `sunset`, `forest`, `nebula`, `gold` (Royal Gold), `crimson`, `mono` (Mono Light) are free; `card1`, `card2`, `card3`, `card4` are premium. Premium swatches are `disabled` in the UI when `config.isPremium !== true`, and the server rejects them on save with `card.background "cardN" requires premium`. Gating is per guild, resolved from `isPremium` + `premiumExpiresAt` on the Guild document.

The preview panel calls `POST /cards/preview` with `{ guildId, card }` on a 700 ms debounce, with a stale-response guard and object URLs revoked on replace, and renders the returned PNG. The preview endpoint validates with `allowPremium: true`, so a non-premium manager can still see premium art. Free gradients are CSS; the four premium thumbnails are fetched from `GET /cards/<key>`.

### Verification — click-to-verify gate

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `verificationChannelId` | `string \| null` | `null` | `PATCH /guilds/:id/config` | Snowflake or `null`. **No channel means verification is off.** The picker offers only `GuildText` + `GuildAnnouncement`. |
| `verificationRoleId` | `string \| null` | `null` | same | Snowflake or `null`. Granted after verifying. Not checked against `@everyone`/managed — the role rule only covers `adminRoleId`/`modRoleId`/`muteRoleId`/`autoroleId`. |
| `verificationTitle` | `string \| null` | DB default `Server Verification` | same | `TextInput maxlength={256}`; server cap 256. Sending `null` leaves the Mongoose default in place, so clearing the box does not remove the title. |
| `verificationMessage` | `string \| null` | DB default `Click the button below to verify yourself and gain access to the server!` | same | `TextArea maxlength={2000}`; server cap 2000. The hint claims Welcome-style placeholders are supported, but `createVerificationEmbed` (`src/commands/Verification/verification.ts:64`) embeds the string verbatim — `{{...}}` tokens are **not** substituted here. |
| `verificationDisabledMessage` | `string \| null` | DB default `Verification is currently disabled.` | same | `TextArea maxlength={1000}`; server cap 1000. |
| `verificationFooter` | `string \| null` | `null` | same | `TextInput maxlength={500}`; server cap 500. |
| `verificationThumb` | `string \| null` | `null` | same | `TextInput maxlength={512}`. Server (`guild-config.ts:136`): `null`, `''`, or an `http(s)` URL of ≤512 chars whose hostname contains a dot (`isSafeImageUrl`). Stored trimmed. |

`verificationMessageId` (the live prompt message) and `verificationLastModifiedBy` are Guild fields the dashboard **cannot** set — they are not on the config whitelist. The live Discord preview is a client-side mock with a fake "Verify" primary button and a hard-coded `#3b66ff` embed color; the button label, emoji and embed color are not configurable anywhere in the dashboard.

### AutoMod — three layers: Helix filters, keyword lists, Discord native rules

#### Layer 1 — Helix filters (`automodSettings`)

Enforced by the bot on every message; members with Manage Messages, plus anything in `ignoredChannels`/`ignoredRoles`, are exempt; violations are logged as `automod.action` and earn no XP. Validated by `cleanAutomodBody` (`src/lib/utils/sanitize.ts:210`).

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `automodSettings.enabled` | boolean | `false` (only treated as on when the key is `true`) | `PATCH /guilds/:id/config` | Master switch for all bot-side filters. |
| `automodSettings.blockInvites` | boolean | `false` | same | Deletes messages containing `discord.gg` / `discord.com/invite` links. |
| `automodSettings.blockLinks` | boolean | `false` | same | Deletes messages containing `http(s)` links. |
| `automodSettings.caps.enabled` | boolean | `true` (UI reads `!== false`) | same | — |
| `automodSettings.caps.minLength` | integer | `10` | same | `input min=5 max=500`; server requires integer 5–500. Below that threshold the caps filter never fires. |
| `automodSettings.caps.percent` | integer | `70` | same | `input min=10 max=100`; server requires integer 10–100. |
| `automodSettings.emoji.enabled` | boolean | `true` | same | — |
| `automodSettings.emoji.max` | integer | `10` | same | `input min=1 max=100`; server integer 1–100. |
| `automodSettings.spam.enabled` | boolean | `true` | same | — |
| `automodSettings.spam.count` | integer | `5` | same | `input min=2 max=20`; server integer 2–20. |
| `automodSettings.spam.intervalSeconds` | integer | `10` | same | `input min=2 max=120`; server integer 2–120. |
| `automodSettings.repeatText.enabled` | boolean | `false` (only when `true`) | same | Per channel. |
| `automodSettings.repeatText.count` | integer | `3` | same | `input min=2 max=20`; server integer 2–20. |
| `automodSettings.repeatText.intervalSeconds` | integer | `60` | same | `input min=2 max=300`; server integer 2–300. |
| `automodSettings.spoilers.enabled` | boolean | `false` (only when `true`) | same | Discord spoiler-formatted text and attachments. |
| `automodSettings.attachments.enabled` | boolean | `true` | same | — |
| `automodSettings.attachments.max` | integer | `5` | same | `input min=0 max=10`; server integer 0–10. `0` deletes every message with any attachment. |
| `automodSettings.zalgo` | boolean | `false` | same | Combining-mark / glitch text. |
| `automodSettings.timeoutSeconds` | integer | `600` | same | `input min=10 max=2419200` (28 days); server integer 10–2 419 200. Only used by the `delete_timeout` action. |
| `automodSettings.action` | enum | `delete` | same | One of `delete`, `delete_warn`, `delete_timeout`, `delete_kick`, `delete_ban`. |
| `automodSettings.actions` | `Record<filter, action>` | falls back to `action` | same | Keys restricted to the 9 filters below, values to the 5 actions. The page renders a `<select>` per filter whose displayed value is `actions[filter] ?? action`, but only writes to `actions` when that select is actually changed — untouched filters are not persisted per-filter. |
| `automodSettings.actions.invites` | enum | inherits `action` | same | Filter id `invites`. |
| `automodSettings.actions.links` | enum | inherits `action` | same | Filter id `links`. |
| `automodSettings.actions.caps` | enum | inherits `action` | same | — |
| `automodSettings.actions.emoji` | enum | inherits `action` | same | — |
| `automodSettings.actions.spam` | enum | inherits `action` | same | — |
| `automodSettings.actions.repeat` | enum | inherits `action` | same | Note the filter id is `repeat` while the settings object key is `repeatText`. |
| `automodSettings.actions.spoilers` | enum | inherits `action` | same | — |
| `automodSettings.actions.attachments` | enum | inherits `action` | same | — |
| `automodSettings.actions.zalgo` | enum | inherits `action` | same | — |
| `automodSettings.ignoredChannels` | `string[]` | `[]` | same | ≤200 snowflakes, deduped. Checkbox grid with a name search. |
| `automodSettings.ignoredRoles` | `string[]` | `[]` | same | ≤200 snowflakes, deduped. |
| `automodSettings.overrides` | `Record<'c:\|r:<snowflake>', { exempt, actions }>` | `{}` | same | ≤200 entries; each key must match `/^[cr]:\d{16,22}$/`. Adding a rule requires picking a target (the page blocks with "Pick a channel or role." otherwise), a filter and an action, plus an optional Exempt checkbox; "Add / update" merges into the existing entry. Role rules win over channel rules; both win over the guild-wide settings. **See Known gaps — the page writes `actions` where the runtime reads `settings`.** |

#### Layer 2 — keyword lists (`automodKeywords`)

Newline-per-word textareas; split on `\n`, trimmed, empties dropped. Used only when installing a Discord preset.

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `automodKeywords.profanity` | `string[]` | `[]` | `PATCH /guilds/:id/config` | ≤300 entries; each trimmed and **silently sliced to 60 chars**; deduped. |
| `automodKeywords.scams` | `string[]` | `[]` | same | Same rules. |
| `automodKeywords.phishing` | `string[]` | `[]` | same | Same rules. |
| `automodKeywords.custom` | `string[]` | `[]` | same | Same rules. The textareas have no `maxlength`, so an entry over 60 chars is truncated on save with no warning. |

#### Layer 3 — Discord native rules

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| Preset `low` | button | — | `POST /guilds/:id/automod-rules` `{ action: 'install', preset: 'low' }` | `preset` must be `low`, `medium` or `high`. The route also accepts an optional `logChannelId` snowflake that the page never sends. The response returns `created[]` and `failed[{ name, reason }]`; failures are surfaced as a notice such as "Installed 4, skipped 2: X (reason); Y (reason)". Discord limits: 6 keyword, 1 spam, 1 mention-spam and 1 preset rule per server; timeout actions only work on keyword and mention-spam rules. |
| Preset `medium` | button | — | same | As above. |
| Preset `high` | button | — | same | As above. |
| `ruleId` | snowflake | — | `DELETE /guilds/:id/automod-rules?ruleId=<id>` | Confirm dialog first; 404 if not found or not deletable. |
| `id`, `name`, `trigger`, `enabled` | read-only | — | `GET /guilds/:id/automod-rules` | A list failure is reported as "Failed to list AutoMod rules (needs Manage Server permission)". There is **no create or edit control** — new native rules must be made with `/automod`; here they can only be preset-installed or deleted. |

### Leveling — XP rates, level-up announcement, role rewards

There is no on/off switch on this page: the `leveling` module toggle (default `false`) is the single switch, and `cleanLeveling` deliberately has no `enabled` field. Validated by `cleanLeveling` (`src/lib/utils/sanitize.ts:156`).

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `leveling.xpMin` | integer | `15` | `PATCH /guilds/:id/config` | `input min=1 max=1000`; server integer 1–1000. |
| `leveling.xpMax` | integer | `25` | same | `input min=1 max=1000`; server integer 1–1000. The page blocks save with "Min XP must not exceed max XP." when `xpMin > xpMax`; the server enforces the same rule. |
| `leveling.cooldownSeconds` | integer | `60` | same | `input min=0 max=3600`; server integer 0–3600. `0` disables the cooldown. |
| `leveling.voiceXpPerMinute` | integer | `0` | same | `input min=0 max=1000`; server integer 0–1000. `0` disables voice XP. |
| `leveling.levelUpChannelId` | `string \| null` | `null` | same | Snowflake or `null`; the picker's `noneLabel` is "Same channel". Text and announcement channels only. |
| `leveling.levelUpMessage` | `string \| null` | `null` | same | `TextInput maxlength={500}`; server cap 500. Placeholders are **single-brace**: `{user}` (mention), `{username}`, `{level}`, `{xp}` — not `{{...}}`. Rendered output is sliced to 2000 chars. `null`/empty uses the default `🎉 {user} reached level {level}!`. |
| `leveling.stackRewards` | boolean | `false` (only when `true`) | same | `true` keeps every earned reward role; `false` keeps only the highest earned one. |
| `leveling.ignoredChannels` | `string[]` | `[]` | same | ≤200 snowflakes, deduped. "No-XP zones." |
| `leveling.ignoredRoles` | `string[]` | `[]` | same | ≤200 snowflakes, deduped. |
| `leveling.roleRewards[].level` | integer | — | same | ≤25 rewards; each level must be a **unique** integer 2–1000. The add form is `min=2 max=1000` and the page rejects a duplicate with "A reward for level N already exists." The list is kept sorted by level, with a per-row Remove. |
| `leveling.roleRewards[].roleId` | snowflake | — | same | Must be a valid Discord id. The page does not check the role against `@everyone`, managed roles, or the bot's hierarchy. A reward whose role no longer exists in the guild is silently skipped at grant time (`src/lib/utils/leveling.ts:112`). |
| Leaderboard | read-only | — | `GET /guilds/:id/leaderboard?limit=25` | Server clamps `limit` to 1–100. Rows are `{ rank, userId, xp, level, into, needed }`; progress is `round(into / max(1, needed) * 100)%` and the user id links to `discord.com/users/<id>`. Reloaded on every `guildId` change; no refresh button. |
### Moderation — warn escalation, warning records, live actions

#### Warn settings (`warnSettings`)

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `warnSettings.thresholds[]` | `{ count, action, duration? }` | `[]` | `PATCH /guilds/:id/config` | ≤20 entries. `count` integer **1–99**; `action` one of `kick`, `ban`, `timeout`; `duration` integer **1–40320 minutes**, meaningful only for `timeout` (its input is `disabled` unless `action === 'timeout'`). `addThreshold()` seeds `{ count: (length + 1) * 3, action: 'timeout', duration: 60 }`, i.e. 3, 6, 9, … Escalation fires on an exact active-warning count match (`ModerationService.ts:144`); if no threshold matches the active count, nothing happens. |
| `warnSettings.modChannelId` | `string \| null` | `null` | same | Snowflake or `null`. |
| `warnSettings.dmEnabled` | boolean | `false` | same | Must be a boolean. |
| `warnSettings.dmTemplate` | `string \| null` | `null` | same | `TextArea maxlength={1000}`; server cap 1000. Single-brace tokens `{user}`, `{guild}`, `{reason}`, `{case}`; rendered output sliced to 2000 with `@everyone`/`@here` defanged. Default template `You have received a warning in **{guild}**.\nReason: {reason}\nCase: {case}`. |
| `warnSettings.reasonAliases` | `Record<string, string>` | `{}` | same | ≤50 entries; each key ≤32 chars, each value ≤1000, both non-empty after trimming. Edited as raw JSON in a `TextArea maxlength={12000}` and validated with `JSON.parse`, which rejects anything that is not a plain object. Aliases are matched case-insensitively and whitespace-collapsed against the warning reason. A JSON syntax error aborts the whole save. A collapsible "Configured aliases" list previews parsed entries. |
| `warnSettings.overrides` | `Record<'c:\|r:<snowflake>', ...>` | `{}` | same | **Not editable** — the page round-trips whatever it read (see the comment at `Moderation.svelte:56`) to avoid wiping it. Server validates ≤200 entries with `c:`/`r:` keys. See Known gaps: the Guild schema has no `warnSettings.overrides` path, so this can never be persisted. |

#### Warning records

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `activeOnly` | query | `false` (sent by the page) | `GET /guilds/:id/warnings?activeOnly=false` | The server default is `true` — any value other than the literal string `"false"` means active-only. A Refresh button reloads the list. |
| `userId` (new warning) | snowflake | — | `POST /guilds/:id/warnings` `{ userId, reason }` | `TextInput maxlength={32}`; `readString(body, 'userId', 32)` plus a snowflake check. `reason` is `TextInput maxlength={1000}`, 1–1000 chars after sanitizing. Both are required and the button stays disabled until both are non-empty. The moderator tag is recorded as `Dashboard <your id>`, `source: 'api'`. A 201 returns `{ warning, activeCount, escalation }`, and `escalation` is what applies the thresholds. |
| `warningId` + `userId` | snowflake | — | `DELETE /guilds/:id/warnings?userId=&warningId=` | The Clear button is only rendered for `active` warnings. 404 if the warning is not found or belongs to another user or guild. |
| `username`, `moderatorTag`, `timestamp`, `active` | read-only | — | — | `username` falls back to `userId`; `moderatorTag` renders as `—` when null. |

#### Live action (immediate against the live server)

A `window.confirm` prompt precedes every run. `durationMinutes` is only sent for `action === 'timeout'`.

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `action` | enum | `timeout` | `POST /guilds/:id/moderation` | UI offers `timeout`, `untimeout`, `kick`, `ban`, `unban`. The route also accepts `clearMessages`, which always returns 501 ("Use channel-scoped purge commands for message deletion") and is not exposed in the UI. |
| `userId` | snowflake | — | same | Required, snowflake-checked. `TextInput maxlength={32}`. |
| `reason` | string | `''` (omitted) | same | `TextInput maxlength={512}`; the server does `sanitizeText(reason ?? 'API moderation action (<action>)', 512)`. |
| `durationMinutes` | number | `10` | same | Only sent for `timeout`. Server clamps to 1–40320, which exceeds Discord's own 28-day maximum, so larger values fail at Discord. The input is `type=number` with no `min`/`max`; non-numeric input falls back to `10` client-side. |
| Response | — | — | — | 409 `BotNotInGuild` if the bot is not in the guild, 403 if Discord reports a missing permission, 500 otherwise. |

### Reaction Roles — message-attached role menus

Stored on the Guild document as `reactionRolesMenus[]`, keyed by `messageId`. Create and update are separate flows; `postViaBot` is only offered when creating.

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `createMessage` (Let the bot post the message) | boolean | `true` | `POST /guilds/:id/reaction-roles` | When `true` the bot posts the menu and the response `menu.messageId` is shown. The checkbox is hidden while editing. |
| `messageId` | snowflake | `''` | same | Required unless `createMessage` is true. `TextInput` with **no `maxlength`**. |
| `channelId` | snowflake | `''` (required) | same / `PATCH` | `SearchPicker allowNone={false}`. Snowflake-checked. Text and announcement channels only. |
| `title` | string | `''` (required) | same / `PATCH` | `TextInput maxlength={256}`; server 1–256 trimmed, non-empty. |
| `description` | string | `''` | same / `PATCH` | `TextArea maxlength={2000}`; server ≤2000. |
| `maxSelections` | integer | `0` = unlimited | same / `PATCH` | `TextInput type=number` with **no min/max in the UI**; the server clamps to 0–25 on create and rejects anything outside 0–25 on PATCH. Non-numeric input becomes `0`. |
| `active` | boolean | `true` | same / `PATCH` | `body.active !== false` on create; must be a boolean on PATCH. |
| `roles[].roleId` | snowflake | — | same / `PATCH` | `SearchPicker allowNone={false}`. Snowflake-checked. No `@everyone`, managed-role or hierarchy check. |
| `roles[].label` | string | — | same / `PATCH` | `TextInput maxlength={100}`; server 1–100 trimmed, non-empty. |
| `roles[].emoji` | string | `''` | same / `PATCH` | **No `maxlength` in the UI**; the server trims and slices to 64 chars, then requires `isValidEmoji` — a unicode emoji or `<:name:id>` / `<a:name:id>`. `isValidEmoji` also accepts anything ≤2 characters, so short junk slips through. |
| `roles` (array size) | — | — | same / `PATCH` | **1–25 on create** ("Provide between 1 and 25 roles"); ≤25 on PATCH. The page silently filters out rows missing `roleId` or `label` and errors with "Add at least one role with a label first." if none survive. |
| `roles[].description` | string | — | — | Supported by the API (≤200 chars) but **not exposed by the dashboard**; it is dropped on every save because the page rebuilds the array from `{ roleId, label, emoji }` only. |
| `messageId` (delete) | snowflake | — | `DELETE /guilds/:id/reaction-roles?messageId=` | Confirm dialog first. 404 if not found. 409 if a menu with the same `messageId` already exists. |
| `messageId` (update) | snowflake | — | `PATCH /guilds/:id/reaction-roles` | Taken from the row being edited, not from the input. 404 if the menu is gone. A failed post returns 502 `Could not post message: <reason>`, usually a missing Send Messages / Embed Links permission. |

A live Discord preview appears whenever a title, description or role row exists; it renders the select menu with a disabled state when `active` is false.

### Reddit Feeds — timed subreddit image posts

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `subreddit` | string | `''` (required) | `POST /guilds/:id/reddit-feeds` | `TextInput`, no `maxlength`. The client strips a leading `r/` case-insensitively; the server requires `/^[A-Za-z0-9_]{3,21}$/` after the same strip. The hint text matches. |
| `channelId` | snowflake | `''` (required) | same | `SearchPicker allowNone={false}`. Snowflake-checked. The bot needs **Send Messages + Embed Links** in the channel. |
| `intervalMinutes` | integer | `60` | same | `TextInput type=number` with no `min`/`max`; the server requires an integer **10–1440** and 400s otherwise. Non-numeric input falls back to `60` client-side. |
| Feeds per guild | cap | `10` | — | The "New feed" card shows `{n}/10` and the button is disabled at 10; the server returns 409 `Feed limit reached (max 10 per server)`. |
| Duplicate guard | — | — | same | 409 `This subreddit is already feeding that channel` (case-insensitive subreddit match against the same channel). |
| `active` | boolean | `true` (on create) | `PATCH /guilds/:id/reddit-feeds` | A `Toggle` per feed; only `active` and `postNow` are ever sent by the page. Optimistically flipped, reverted on error. |
| `postNow` | boolean | — | `PATCH` `{ feedId, postNow: true }` | Posts immediately using the pending or stored `channelId`/`subreddit`, then stamps `lastPostedAt`/`lastPostLink`. 502 with the Reddit error on failure. |
| `feedId` | 24-hex ObjectId | — | `PATCH` / `DELETE ?feedId=` | The server rejects anything not matching `/^[a-f0-9]{24}$/i`; the PATCH error text is misleadingly "feedId is required". |
| `channelId`, `subreddit`, `intervalMinutes` (edit existing) | — | — | `PATCH` | The API supports editing all three, but the dashboard has **no edit form** — only Active, Post now and Delete. |
| `lastPostedAt`, `lastPostLink` | read-only | `null` | — | Rendered as a localized timestamp, or "never posted". |

The page header notes that feeds only run while the **Fun** module is on, and that NSFW posts are always skipped.

### Messages — per-guild message overrides

Highest-priority layer of the resolution chain (above the active message kit, above the locale catalog). Both controls live in one form that doubles as create and edit.

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `messages.<key>` key | string | `''` (required) | `PATCH /guilds/:id/messages` `{ messages: { [key]: text } }` | `TextInput maxlength={64}` with the hint "Lowercase letters, numbers and dashes", and the page copy says "Keys are free-form". **Both are wrong** — see Known gaps. The server requires the key to already exist in `locales/en.json` (89 fixed keys such as `greeting.welcome`, `error.guild.only`, `mod.ban.title`, `economy.balance.title`). The reserved keys `__proto__`, `constructor` and `prototype` are rejected. |
| `messages.<key>` text | string | `''` (required) | same | `TextArea maxlength={2000}` with the hint "Max 2000 characters". The server cap is **1000** chars per key, ≤200 keys per request and ≤64 000 chars total, with at most 20 errors returned. The text may contain only known `{{...}}` placeholders (36 tokens from `PLACEHOLDERS`), and **raw mentions (`@here`, `@everyone`, `<@id>`) and URLs (`https://`, `www.`, `discord.gg/`, `<a `) are rejected outright**. The page's placeholder box lists only 6 of the 36 valid tokens. |
| Delete an override | — | — | same | The API deletes a key when the value is `''`/`null`, but the save button is `disabled` when `text` is empty, so **an override cannot be removed from the dashboard**. |
| `availableKeys`, `placeholders` | read-only | — | `GET /guilds/:id/messages` | The GET response includes both — specifically "so the placeholder hint and the validator drift apart" — but the page **ignores them** and hard-codes its own 6-token list instead. |
| Existing `messages` map | read-only | `{}` | `GET /guilds/:id/messages` | Rendered as a table with a 120-character preview and a per-row Edit button. The empty state is "No custom messages yet." |

---

## Developer pages

All three require the user id in `OWNER_IDS` / `DASHBOARD_OWNER_IDS` (`requireDev`); otherwise the route returns 403 and the page renders "Bot developer access required". The pages also guard client-side on `session.isDeveloper`, populated from `DASHBOARD_OWNER_IDS` in `dashboard/server/config.ts:38`. Search is debounced 400 ms.

### Bot servers — every guild the bot is in

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `search` | string | `''` | `GET /dev/guilds?search=&filter=&page=&limit=20` | Trimmed and sliced to **64 chars** server-side. All-digits means a substring match on the guild id; anything else is a case-insensitive regex on the name (regex-escaped). |
| `filter` | enum | `all` | same | `all`, `premium` (isPremium **and** not expired), `disabled` (`botDisabled === true`), `banned` (`guildBanned === true`), `large` (`memberCount >= 1000`). The page sends exactly these five. |
| `page` | integer | `1` | same | `max(1, ...)`. A "Load more (n left)" button appends. |
| `limit` | integer | `20` | same | Clamped 1–50 server-side; the page always sends `20`. |
| `isPremium` | boolean | `false` | `PATCH /dev/guilds` `{ guildId, isPremium }` | Must be a boolean. `true` with no `premiumDays` means permanent (clears `premiumExpiresAt`); `false` clears it too. |
| `premiumDays` | integer | `30` (input default) | `PATCH` `{ guildId, premiumDays }` | `input min=1 max=3650`; server integer 1–3650. Grants from now and resets `premiumReminderSentAt` so the reminder fires again. The page also clamps client-side with `Math.max(1, Math.min(3650, ...))`. Timed grants DM the server owner (best-effort; `dmSent` is reported back and shown in the notice). |
| `botDisabled` | boolean | `false` | `PATCH` | Must be a boolean. Soft disable: the bot stays, commands reply with `disabledMessage` or a default notice. |
| `disabledMessage` | `string \| null` | `null` (default notice) | `PATCH` | `TextArea maxlength={500}`; server `null` or text ≤500. Supports `supportServer.name` / `supportServer.count` / `supportServer.invite` placeholders. |
| `guildBanned` | boolean | `false` | `PATCH` | Hard ban: the ban notice DM goes out **first**, then the bot leaves immediately and `guildCreate` refuses re-entry. The page reloads the list afterwards because the guild is gone. |
| `banReason` | `string \| null` | `null` | `PATCH` | `TextArea maxlength={1000}`; server `null` or text ≤1000. Internal only, never shown to the server. |
| `action: 'leave'` | — | — | `POST /dev/guilds` `{ guildId, action: 'leave' }` | The bot leaves; it can be re-added. 404 if the bot is not in the guild. |
| `action: 'reset'` | — | — | `POST /dev/guilds` `{ guildId, action: 'reset' }` | **Deletes the whole Guild document** and clears the flag cache. Config reverts to schema defaults, not to whatever the dashboard last wrote. Wipes premium, disabled and banned flags too. |
| AI ban-reason draft | `{ kind, targetId, targetName, context }` | `kind: 'guild'`, `context: ''` | `POST /dev/ai-draft` | `kind` must be `guild` or `user`; `targetId` must be a snowflake; `targetName` ≤100; `context` ≤500 (`TextInput maxlength={500}`). The returned draft is filled into the ban-reason box for review — the draft call stores nothing. 502 `AI unavailable — is Ollama reachable?` on failure. |
| `id`, `name`, `icon`, `memberCount`, `ownerId`, `ownerUsername`, `joinedAt`, `channels`, `roles`, `premiumExpiresAt`, `dmSent` | read-only | — | `GET /dev/guilds` | Sorted by member count desc. The expanded row shows owner id, joined date, channel/role counts and the premium expiry (`permanent` when there is none). The "Open" button links to `/panel/guilds/:id/overview`, which is **not a valid section id** — see Known gaps. |

### Bot users — everyone with a Helix profile

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| `search` | string | `''` | `GET /dev/users?search=&filter=&page=&limit=20` | 64-char cap. Regex-escaped substring match against `userId` or `username` (case-insensitive). |
| `filter` | enum | `all` | same | `all`, `premium` (`isPremium: true` — this filters the raw flag, unlike the guild filter which also checks expiry), `banned` (`botBanned: true`), `warned` (`warnings.active: true`). |
| `page` / `limit` | integer | `1` / `20` | same | Same clamps as the guild page. Sorted by `economy.wallet` desc. |
| `isPremium` | boolean | `false` | `PATCH /dev/users` `{ userId, isPremium }` | Must be a boolean. `true` alone means permanent. |
| `premiumDays` | integer | `30` (input default) | `PATCH` | `input min=1 max=3650`; server integer 1–3650. Resets `premiumReminderSentAt`; DMs the user. |
| `botBanned` | boolean | `false` | `PATCH` | Must be a boolean. Enforced on every command by the global precondition. DMs the user on ban. |
| `banReason` | `string \| null` | `null` | `PATCH` | `TextArea maxlength={1000}`; server `null` or text ≤1000. |
| `resetEconomy` | boolean | — | `PATCH` | `true` replaces the whole `economy` object with new-player defaults: `wallet: 1000`, `bank: 0`, `bankLimit: 10000`, `level: 1`, `experience: 0`, empty `inventory`/`equipment`/`activeEffects`/`transactions`/`achievements`, `lastDaily`/`lastWork` null, and `settings: { dmsOnAuction: true, autoDeposit: false, publicProfile: true }`. The response flag `resetEconomy` makes the page overwrite the local row with `wallet 1000 / bank 0 / level 1`. **Irreversible.** |
| AI ban-reason draft | `{ kind: 'user', targetId, targetName, context }` | `context: ''` | `POST /dev/ai-draft` | Same caps as the guild version; `targetName` falls back to the user id. |
| `userId`, `username`, `lastSeen`, `wallet`, `bank`, `level`, `activeWarnings` | read-only | — | `GET /dev/users` | `username` renders as `?` when null; `activeWarnings` renders as `—` when 0. The expanded row shows the last-seen timestamp and premium expiry. |

The PATCH response is `{ userId, isPremium, premiumExpiresAt, botBanned, banReason, resetEconomy, dmSent }` and the page reads exactly those fields.

### Bot stats — bot internals and DB totals

Fully read-only, `GET /dev/stats`, with a Retry button on failure. No 429 handling and no auto-refresh — the numbers are a snapshot from the moment the page loaded.

| Option | Type | Default | Saved to | Validation / notes |
|---|---|---|---|---|
| Servers | read-only number | — | `GET /dev/stats` | `client.guilds.cache.size`. |
| Cached users | read-only number | — | same | `client.users.cache.size` (cache size, not total users). |
| Commands | read-only number | — | same | Command store size. |
| Uptime | read-only string | — | same | `client.uptime` rendered as `Xd Xh` / `Xh Xm` / `Xm`. |
| `version` | read-only string | — | same | From the bot's `package.json`. |
| `bot.username`, `bot.id` | read-only | — | same | — |
| `modules` | read-only number | — | same | `client.modules?.size ?? 0` — loaded Sapphire modules, **not** the number of toggleable Helix modules. |
| `database.users` | read-only number | — | same | `User` count, or `-1` on error. |
| `database.guildDocs` | read-only number | — | same | `Guild` count, or `-1` on error. |
| `database.activeAuctions` | read-only number | — | same | `Auction` where `status: 'active'`, or `-1`. |
| `database.items` | read-only number | — | same | `EconomyItem` count, or `-1`. |
| `memory.heapUsedMb` / `heapTotalMb` / `rssMb` | read-only number | — | same | Rounded MB from `process.memoryUsage()`. |
| `discord.channels` | read-only number | — | same | Returned by the API but never rendered on the page. |
---

## API routes

Paths are the `route` strings registered in `src/routes/api/*.ts` (relative to the bot's `/api` base). The dashboard reaches them as `/api/bot<path>`, proxied by `dashboard/server/index.ts:271`. "Auth" is the bot-side requirement: **Session** = a valid Discord OAuth token (any logged-in user), **Manager** = `requireManageableGuild` (guild member with Manage Server, plus the bot present), **Dev** = additionally in `OWNER_IDS`, **None** = unauthenticated public route.

| Method | Path | Auth | Body / query | Effect | Used by |
|---|---|---|---|---|---|
| GET | `/api/auth/login` | — | — | 302 to Discord OAuth with a 5-minute `helix_oauth_state` cookie. IP rate limit 20/min. | Servers (login card), every page's "Log in" link |
| GET | `/api/auth/callback` | state cookie | `?code=&state=` | Exchanges the code, seals the session, redirects to `/panel`. Mismatched state lands on `/panel?error=oauth_state`. | OAuth redirect target |
| POST | `/api/auth/logout` | — | — | Clears the session cookie. | `App.svelte` logout button |
| GET, OPTIONS | `/api/me` | cookie | — | `{ user, isDeveloper, avatarUrl }`. CORS-allowed to the configured main-site origin only, never wildcard. | `loadSession()` on every page load |
| GET | `/api/invite-url` | — | `?guildId=` | Builds a bot invite URL. | Servers |
| ANY | `/api/bot/*` (proxy) | cookie | forwarded | Attaches `Authorization: Bearer <discord token>`, refreshes and re-seals the cookie when the token is within 60 s of expiry, passes binary image responses through untouched, returns 502 `Bot API unreachable` when the bot is down. 403 on an `Origin` mismatch for POST/PATCH/PUT/DELETE. | All pages |
| GET | `me/guilds` | Session | — | `{ total, manageable, guilds, manageableGuilds }` with `owner`, `permissions`, `canManage`, `hasBot`. | Servers |
| GET | `me/data` | Session | — | The caller's own identity, economy, warnings and server list. | My data |
| GET | `economy/leaderboard` | None | `?type=total\|wallet\|bank\|level&limit=` | Leaderboard rows. `limit` clamped 1–100. | Economy |
| GET | `economy/items` | None | `?search=&category=&rarity=&shopOnly=true&limit=&page=&itemId=` | Item catalog. `search`/`category`/`rarity` must be 1–64 chars; `limit` clamped 1–100. | Economy |
| GET | `auctions` | None | `?status=&guildId=&sellerId=&limit=&page=&auctionId=` | Auction listing. `status` defaults to `active`; `limit` clamped 1–100. | Economy |
| GET | `commands` | None | — | Every registered command with `name`, `description`, `category`, `module`, sorted by name. | General |
| GET | `guilds/[guildId]` | Session (member) | — | Live guild state. `config`, `channels` (≤200) and `roles` (≤200) only for managers. | `loadGuild` (every guild page), Overview |
| GET, PATCH | `guilds/[guildId]/config` | Manager | body: any subset of the 38 whitelisted fields | GET returns the whole config minus `setupWizard`; PATCH `$set`s the whitelisted keys after validation and invalidates the prefix / disabled-commands / automation caches. | General, Logging, Welcome, Verification, AutoMod, Leveling, Moderation |
| GET, PATCH | `guilds/[guildId]/modules` | Manager | `{ modules: { <key>: boolean } }` | Module catalog merged with state / sets flags. | Modules |
| GET, POST, DELETE | `guilds/[guildId]/automod-rules` | Manager + bot in guild | POST `{ action: 'install', preset, logChannelId? }`; DELETE `?ruleId=` | Lists / preset-installs / deletes Discord native AutoMod rules. 404 if the bot is not in the guild. | AutoMod |
| GET, POST, DELETE | `guilds/[guildId]/warnings` | Manager | `?userId=&activeOnly=false&warningId=`; POST `{ userId, reason }` | Lists, creates (201) and clears warnings. | Moderation |
| POST | `guilds/[guildId]/moderation` | Manager | `{ action, userId, reason?, durationMinutes? }` | Runs timeout / untimeout / kick / ban / unban live. `clearMessages` always 501. | Moderation |
| GET | `guilds/[guildId]/leaderboard` | Manager | `?limit=` (1–100) | XP leaderboard with `into`/`needed` progress. | Leveling |
| GET, PATCH | `guilds/[guildId]/messages` | Manager | `{ messages: { <key>: <text> } }` | Per-guild message overrides. GET also returns `availableKeys` and `placeholders`. | Messages |
| GET, POST, PATCH, DELETE | `guilds/[guildId]/reaction-roles` | Manager | see Reaction Roles table; DELETE `?messageId=` | CRUD on `reactionRolesMenus[]`. | Reaction Roles |
| GET, POST, PATCH, DELETE | `guilds/[guildId]/reddit-feeds` | Manager | see Reddit Feeds table; DELETE `?feedId=` | CRUD on `redditFeeds[]`, plus immediate posting. | Reddit Feeds |
| GET, POST | `cards/[key]` | Session (GET), Manager (POST) | POST `{ guildId, card }` | GET serves a bundled card background PNG (any logged-in user). POST renders a sample card PNG for a manageable guild. The POST branch ignores `[key]`, which is why the preview at `cards/preview` works. | Welcome (background thumbnails, live preview) |
| GET | `dev/guilds` | Dev | `?search=&filter=&page=&limit=` | Paginated bot-guild list with premium/disabled/banned flags. | Bot servers |
| PATCH | `dev/guilds` | Dev | `{ guildId, isPremium?, premiumDays?, botDisabled?, disabledMessage?, guildBanned?, banReason? }` | Sets flags, DMs the owner where relevant, leaves the guild on ban. | Bot servers |
| POST | `dev/guilds` | Dev | `{ guildId, action: 'leave'\|'reset' }` | Leaves, or deletes the Guild document. | Bot servers |
| GET | `dev/users` | Dev | `?search=&filter=&page=&limit=` | Paginated user list with economy totals and active-warning counts. | Bot users |
| PATCH | `dev/users` | Dev | `{ userId, isPremium?, premiumDays?, botBanned?, banReason?, resetEconomy? }` | Sets flags, DMs the user, or resets economy to new-player defaults. | Bot users |
| GET | `dev/stats` | Dev | — | Version, uptime, cache sizes, DB counts, memory. | Bot stats |
| POST | `dev/ai-draft` | Dev | `{ kind, targetId, targetName?, context? }` | Drafts a ban reason with the private Ollama instance. 502 if unreachable. | Bot servers, Bot users |

Routes that exist in `src/routes/api/` but are **not** called by any dashboard page: `health` (used only by the dashboard's startup handshake at `dashboard/server/index.ts:290`, with an `x-helix-dashboard` header), `hello-world`, `server-count`, `stats`, `modules`, `user-economy` (`users/[userId]/economy`), `guilds` (the open-CORS public directory behind the website marquee and the `helix_public_guilds` MCP tool), `kits` (`GET`/`POST kits`, returning `locales`, `availableKeys` and `placeholders`), and `kits-share` (`kits/[kitId]` plus `POST guilds/[guildId]/kit` for activating or clearing the active kit). None of the locale or message-kit features have a dashboard page even though the config route has validation code for them.

## Known gaps / notes

- **AutoMod scope overrides are written under the wrong key and are silently ignored.** `dashboard/src/pages/guild/Automod.svelte:109` writes `overrides[key] = { exempt, actions: { [filter]: action } }`. The runtime merges `rule.settings`, not `rule.actions`: `resolveScopes` (`src/lib/utils/scopedRules.ts:60`) reads `rule.settings`, the `/automod` command writes `settings.actions` (`src/commands/Moderation/automod.ts:359-363`), and the validator only inspects `settings` and `exempt` (`src/lib/utils/sanitize.ts:266`). So every per-channel / per-role action set from the dashboard is accepted with a 200 and never applied. The page's own `scopeSummary` (`Automod.svelte:94-98`) reads `rule.actions`, so the UI happily displays a rule that does nothing, and re-adding the same scope compounds the wrong key rather than fixing it.
- **`warnSettings.overrides` cannot be persisted.** `Moderation.svelte:58` reads it and `Moderation.svelte:96` writes it back, but the `warnSettings` subdocument in `src/models/Guild.ts:340-352` has no `overrides` path, so Mongoose strips it on every save. The round-trip therefore always sends `{}`, and `ModerationService.resolveRules` (`src/lib/services/ModerationService.ts:161`) can never see a real override map. The interface at `Guild.ts:219` already declares the field, so the schema just needs `overrides: { type: Schema.Types.Mixed, default: {} }`.
- **The Messages page contradicts the Messages API.** `Messages.svelte:61` says "Keys are free-form" and `Messages.svelte:95` hints "Lowercase letters, numbers and dashes" with `maxlength={64}`, but `guild-messages.ts:50` now runs `validateMessages` (`src/lib/kits/validation.ts:96`), which rejects any key not already in `locales/en.json` (89 fixed keys), rejects raw `@here`/`@everyone`/`<@id>` and any URL, and caps each value at **1000** characters — not the 2000 the `TextArea` allows (`Messages.svelte:96`). Practically every save from that page will 400. The GET response already returns `availableKeys` and `placeholders` for exactly this reason; the page ignores both and hard-codes a 6-token placeholder list out of the 36 the validator accepts.
- **Overrides cannot be deleted from the Messages page.** The API deletes a key when the value is `''`/`null` (`guild-messages.ts:54-56`), but the Save button is `disabled` when `text` is empty (`Messages.svelte:97`).
- **Verification changes made in the dashboard never reach the live prompt.** `PATCH /guilds/:id/config` only `$set`s the document; the `checkAndSendVerificationMessage` / `updateVerificationMessage` path that posts or edits the live verify embed runs only from the `/verification` command (`src/commands/Verification/verification.ts:472-487`). Saving in the dashboard changes the stored text while the posted message keeps the old content. There is also no control for `verificationMessageId`, so a server that has never run `/verification setup` never gets a prompt posted from the dashboard.
- **`verificationMessage` placeholders are not substituted.** `Verification.svelte:82` claims it supports the Welcome placeholders, but `createVerificationEmbed` (`src/commands/Verification/verification.ts:64-82`) embeds the string verbatim.
- **Verification role validation is weaker than the staff-role validation.** `guild-config.ts:236` only checks `adminRoleId`, `modRoleId`, `muteRoleId` and `autoroleId` against `@everyone`/managed roles. `verificationRoleId`, every `leveling.roleRewards[].roleId` and every reaction-role `roleId` can be set to `@everyone`, to a managed role, or to a role above the bot's highest position, because no route performs a hierarchy check.
- **The Logging page's "Ignored user IDs" box has no validation.** `Logging.svelte:230` is a free-text comma-separated field with no `maxlength` and no client-side snowflake check, while `guild-config.ts:159-165` requires every entry to match `/^\d{16,22}$/` and caps the list at 500. A single wrong-length id fails the entire Logging save with an opaque 400.
- **Number inputs without bounds.** `Moderation.svelte:284` (timeout minutes), `ReactionRoles.svelte:201` (`maxSelections`) and `RedditFeeds.svelte:142` (`intervalMinutes`) all render bare `type=number` inputs with no `min`/`max`, so the server is the only thing enforcing the documented ranges and the error surfaces as a 400 in the SaveBar after the fact. `Moderation.svelte:196` (`count`) and `:208` (`duration`) set `min=1` but no `max`, while the server caps count at 99 and duration at 40320.
- **`leveling.repeatText` vs `actions.repeat`.** The settings key is `repeatText` but the per-filter action key is `repeat` (`src/lib/utils/sanitize.ts:207`). The dashboard handles this correctly, but it is a trap for anyone writing against the API.
- **Dead validation in `guild-config.ts`.** `validateConfigUpdate` validates a `locale` key (`guild-config.ts:178`) and the cache-invalidation block checks `'modules' in update` and `'activeKitId' in update` (`:252-253`), but neither `locale`, `modules` nor `activeKitId` is in `UPDATABLE_FIELDS`, so `sanitizeConfigUpdate` strips them before validation. The guild locale and the active message kit are only reachable through commands and `POST guilds/[guildId]/kit` — neither has a dashboard page, even though kits and locales are user-facing features with their own API routes.
- **`Overview.svelte:44` shows the legacy `modLogChannelId`,** not the `logChannelId` that the Logging page now treats as the default destination, so a server that has migrated to the new system shows "Mod log: Not set up" even though logging works.
- **`Overview.svelte:31` labels the channel count "Text channels"** but `guild-detail.ts:79` includes announcement channels.
- **`DevGuilds.svelte:205` links to `/panel/guilds/:id/overview`,** which is not one of the 12 valid section ids in `GuildLayout.svelte:21-34` (the overview section is `dashboard`). The link always lands on "Unknown section".
- **`me-guilds` never returns `approximate_member_count`,** although `GuildListEntry` declares it optional and `Servers.svelte:96` renders it, so the member count under each server name never appears.
- **`me/data` returns two different `servers` shapes.** `src/routes/api/me-data.ts:38` returns `[]` when no user document exists, while `:74` returns `{ known, lastSeen, firstSeen }`. `MyData.svelte:94` reads `data.servers.known.length`, so a brand-new user would hit a runtime error — currently masked because that branch only renders when `hasData` is true.
- **Permissions come from the OAuth2 guild payload, not live.** `canManageGuild` reads the permission integer off the OAuth guild entry, so a permission change inside Discord can take up to 60 s to be reflected (the token-keyed guilds cache TTL in `src/lib/utils/apiAuth.ts:15`).
- **The 31 logging event keys are mirrored by hand** (`Logging.svelte:12-56`, flagged in that file's own comment as a mirror of `src/lib/logging/logEvents.ts`). The server rejects unknown keys, so adding an event to `logEvents.ts` without updating the dashboard is safe, but removing one breaks the Logging save with `logEvents has unknown event: <key>`.
- **`Economy.svelte` never paginates.** All three queries hard-code `limit=25` and the pages are single-screen, so anything past the first 25 entries is unreachable from the dashboard.