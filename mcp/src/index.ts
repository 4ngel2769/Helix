#!/usr/bin/env node
/**
 * Helix MCP server — exposes the Helix Discord bot HTTP API as MCP tools.
 *
 * Env:
 *   HELIX_API_URL       Base URL of the bot API (default: http://localhost:8080/api)
 *   HELIX_DISCORD_TOKEN Default Discord OAuth2 access token (identify+guilds scopes).
 *                       Can be overridden per-tool call via the `discordToken` param.
 *                       Authenticated tools need a USER token with access to the guild;
 *                       the caller must have MANAGE_GUILD for mutating guild endpoints.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_URL = (process.env.HELIX_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');
const DEFAULT_TOKEN = process.env.HELIX_DISCORD_TOKEN ?? process.env.DISCORD_TOKEN ?? '';

const discordTokenField = z
	.string()
	.optional()
	.describe('Discord OAuth2 access token (identify + guilds scopes). Falls back to HELIX_DISCORD_TOKEN env.');

function tokenOf(token?: string): string | undefined {
	const t = (token ?? DEFAULT_TOKEN).trim();
	return t ? t : undefined;
}

interface ApiOptions {
	method?: string;
	token?: string;
	query?: Record<string, string | number | boolean | undefined>;
	body?: unknown;
}

async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
	const url = new URL(`${API_URL}${path}`);
	for (const [key, value] of Object.entries(options.query ?? {})) {
		if (value !== undefined) url.searchParams.set(key, String(value));
	}

	const headers: Record<string, string> = { 'content-type': 'application/json' };
	const resolved = tokenOf(options.token);
	if (resolved) headers.authorization = `Bearer ${resolved}`;

	const response = await fetch(url, {
		method: options.method ?? 'GET',
		headers,
		body: options.body === undefined ? undefined : JSON.stringify(options.body)
	});

	const text = await response.text();
	let data: unknown = text;
	try {
		data = text ? JSON.parse(text) : null;
	} catch {
		// keep raw text
	}

	if (!response.ok) {
		const detail = typeof data === 'object' && data !== null ? JSON.stringify(data) : String(data);
		throw new Error(`Helix API ${response.status} ${response.statusText} for ${options.method ?? 'GET'} ${path}: ${detail}`);
	}

	return data as T;
}

function textResult(data: unknown) {
	return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

const server = new McpServer({ name: 'helix', version: '1.0.0' });

// ---------- Public / bot info ----------

server.tool('helix_health', 'Check the Helix bot API health (version, uptime, guild count, DB status).', {}, async () =>
	textResult(await api('/health'))
);

server.tool(
	'helix_stats',
	'Get Helix bot statistics (servers, users, channels, commands, modules, memory).',
	{},
	async () => textResult(await api('/stats'))
);

server.tool(
	'helix_commands',
	'List all bot commands (name, description, category).',
	{},
	async () => textResult(await api('/commands'))
);

server.tool(
	'helix_modules',
	'List the module catalog (key, name, description, default state).',
	{},
	async () => textResult(await api('/modules'))
);

server.tool(
	'helix_public_guilds',
	'List public servers the bot is in (id, name, member count, icon).',
	{},
	async () => textResult(await api('/guilds'))
);

// ---------- Authenticated user ----------

server.tool(
	'helix_my_guilds',
	"List the Discord user's servers enriched with bot presence and manageability. Needs a user OAuth token.",
	{ discordToken: discordTokenField },
	async ({ discordToken }) => textResult(await api('/me/guilds', { token: tokenOf(discordToken) }))
);

// ---------- Guild ----------

const guildIdField = z.string().describe('Discord guild (server) ID.');

server.tool(
	'helix_guild',
	'Get live guild detail (members, channels, roles for managers, config summary). Caller must be a guild member.',
	{ guildId: guildIdField, discordToken: discordTokenField },
	async ({ guildId, discordToken }) => textResult(await api(`/guilds/${guildId}`, { token: tokenOf(discordToken) }))
);

server.tool(
	'helix_guild_config_get',
	'Get the full stored configuration of a guild (prefix, log channels, welcome/farewell, verification, automod, warn settings). Needs MANAGE_GUILD.',
	{ guildId: guildIdField, discordToken: discordTokenField },
	async ({ guildId, discordToken }) => textResult(await api(`/guilds/${guildId}/config`, { token: tokenOf(discordToken) }))
);

server.tool(
	'helix_guild_config_update',
	'Update whitelisted guild config fields (prefix, role IDs, log/welcome/farewell channel IDs + messages, verification, automodKeywords, warnSettings). Needs MANAGE_GUILD. Only provided fields are updated.',
	{
		guildId: guildIdField,
		discordToken: discordTokenField,
		prefix: z.string().min(1).max(5).nullable().optional().describe('Command prefix (1-5 chars) or null for default.'),
		adminRoleId: z.string().nullable().optional(),
		modRoleId: z.string().nullable().optional(),
		muteRoleId: z.string().nullable().optional(),
		autoroleId: z.string().nullable().optional(),
		disabledCommands: z.array(z.string()).optional().describe('Command names disabled in this guild.'),
		modLogChannelId: z.string().nullable().optional(),
		memberLogChannelId: z.string().nullable().optional(),
		messageEditLogChannelId: z.string().nullable().optional(),
		messageDeleteLogChannelId: z.string().nullable().optional(),
		nicknameLogChannelId: z.string().nullable().optional(),
		roleLogChannelId: z.string().nullable().optional(),
		welcomeChannelId: z.string().nullable().optional(),
		welcomeMessage: z.string().nullable().optional(),
		farewellChannelId: z.string().nullable().optional(),
		farewellMessage: z.string().nullable().optional(),
		systemChannelId: z.string().nullable().optional(),
		verificationChannelId: z.string().nullable().optional(),
		verificationRoleId: z.string().nullable().optional(),
		verificationMessage: z.string().nullable().optional(),
		verificationTitle: z.string().nullable().optional(),
		verificationFooter: z.string().nullable().optional(),
		advancedJson: z
			.string()
			.optional()
			.describe('Extra fields (automodKeywords, warnSettings, ...) as a JSON object string. Merged over the explicit fields.')
	},
	async ({ guildId, discordToken, advancedJson, ...fields }) => {
		const body: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(fields)) {
			if (value !== undefined) body[key] = value;
		}
		if (advancedJson) Object.assign(body, JSON.parse(advancedJson) as Record<string, unknown>);
		return textResult(await api(`/guilds/${guildId}/config`, { method: 'PATCH', token: tokenOf(discordToken), body }));
	}
);

server.tool(
	'helix_guild_modules_get',
	'Get per-guild module enable/disable state. Needs MANAGE_GUILD.',
	{ guildId: guildIdField, discordToken: discordTokenField },
	async ({ guildId, discordToken }) => textResult(await api(`/guilds/${guildId}/modules`, { token: tokenOf(discordToken) }))
);

server.tool(
	'helix_guild_modules_set',
	'Enable/disable modules for a guild, e.g. {"economy": false}. Needs MANAGE_GUILD.',
	{
		guildId: guildIdField,
		discordToken: discordTokenField,
		modules: z.record(z.boolean()).describe('Map of module key to enabled flag.')
	},
	async ({ guildId, discordToken, modules }) =>
		textResult(await api(`/guilds/${guildId}/modules`, { method: 'PATCH', token: tokenOf(discordToken), body: { modules } }))
);

// ---------- Economy ----------

server.tool(
	'helix_user_economy',
	'Get a user economy profile (wallet, bank, level, inventory, stats). Respects private profiles.',
	{
		userId: z.string().describe('Discord user ID.'),
		inventoryLimit: z.number().min(0).max(100).optional().describe('Max inventory items returned (default 20).')
	},
	async ({ userId, inventoryLimit }) => textResult(await api(`/users/${userId}/economy`, { query: { inventoryLimit } }))
);

server.tool(
	'helix_leaderboard',
	'Get the economy leaderboard.',
	{
		type: z.enum(['wallet', 'bank', 'total', 'level']).optional().describe('Ranking type (default total).'),
		limit: z.number().min(1).max(100).optional().describe('Max entries (default 10).')
	},
	async ({ type, limit }) => textResult(await api('/economy/leaderboard', { query: { type, limit } }))
);

server.tool(
	'helix_shop_search',
	'Search the economy item/shop catalog.',
	{
		search: z.string().optional().describe('Name substring.'),
		category: z.string().optional(),
		rarity: z.string().optional(),
		shopOnly: z.boolean().optional().describe('Only items available in the shop.'),
		limit: z.number().min(1).max(100).optional(),
		page: z.number().min(1).optional(),
		itemId: z.string().optional().describe('Fetch a single item by itemId.')
	},
	async ({ search, category, rarity, shopOnly, limit, page, itemId }) =>
		textResult(await api('/economy/items', { query: { search, category, rarity, shopOnly, limit, page, itemId } }))
);

server.tool(
	'helix_auctions',
	'List auction-house auctions (read-only).',
	{
		status: z.enum(['active', 'completed', 'cancelled', 'expired']).optional().describe('Default active.'),
		guildId: z.string().optional(),
		sellerId: z.string().optional().describe('Discord user ID of the seller.'),
		limit: z.number().min(1).max(100).optional(),
		page: z.number().min(1).optional(),
		auctionId: z.string().optional().describe('Fetch a single auction.')
	},
	async ({ status, guildId, sellerId, limit, page, auctionId }) =>
		textResult(await api('/auctions', { query: { status, guildId, sellerId, limit, page, auctionId } }))
);

// ---------- Moderation ----------

server.tool(
	'helix_warnings_list',
	'List moderation warnings for a guild, optionally filtered by user. Needs MANAGE_GUILD.',
	{
		guildId: guildIdField,
		discordToken: discordTokenField,
		userId: z.string().optional().describe('Filter by Discord user ID.'),
		activeOnly: z.boolean().optional().describe('Only active warnings (default true).')
	},
	async ({ guildId, discordToken, userId, activeOnly }) =>
		textResult(await api(`/guilds/${guildId}/warnings`, { token: tokenOf(discordToken), query: { userId, activeOnly } }))
);

server.tool(
	'helix_warning_create',
	'Create a moderation warning for a user. Needs MANAGE_GUILD.',
	{
		guildId: guildIdField,
		discordToken: discordTokenField,
		userId: z.string().describe('Discord user ID to warn.'),
		reason: z.string().describe('Warning reason.')
	},
	async ({ guildId, discordToken, userId, reason }) =>
		textResult(await api(`/guilds/${guildId}/warnings`, { method: 'POST', token: tokenOf(discordToken), body: { userId, reason } }))
);

server.tool(
	'helix_warning_clear',
	'Clear (deactivate) a warning by its ID. Needs MANAGE_GUILD.',
	{
		guildId: guildIdField,
		discordToken: discordTokenField,
		userId: z.string().describe('Discord user ID owning the warning.'),
		warningId: z.string().describe('Warning document ID (from helix_warnings_list).')
	},
	async ({ guildId, discordToken, userId, warningId }) =>
		textResult(
			await api(`/guilds/${guildId}/warnings`, { method: 'DELETE', token: tokenOf(discordToken), query: { userId, warningId } })
		)
);

server.tool(
	'helix_moderate',
	'Execute a live moderation action (timeout, untimeout, kick, ban, unban). Needs MANAGE_GUILD and bot permissions.',
	{
		guildId: guildIdField,
		discordToken: discordTokenField,
		action: z.enum(['timeout', 'untimeout', 'kick', 'ban', 'unban']),
		userId: z.string().describe('Discord user ID to moderate.'),
		reason: z.string().optional().describe('Audit-log reason.'),
		durationMinutes: z.number().min(1).max(40320).optional().describe('Timeout duration (default 10).')
	},
	async ({ guildId, discordToken, action, userId, reason, durationMinutes }) =>
		textResult(
			await api(`/guilds/${guildId}/moderation`, {
				method: 'POST',
				token: tokenOf(discordToken),
				body: { action, userId, reason, durationMinutes }
			})
		)
);

// ---------- Reaction roles ----------

const reactionRoleSchema = z.object({
	roleId: z.string(),
	label: z.string(),
	description: z.string().optional(),
	emoji: z.string().optional()
});

server.tool(
	'helix_reaction_roles_list',
	'List reaction-role menus for a guild (or one menu via messageId). Needs MANAGE_GUILD.',
	{
		guildId: guildIdField,
		discordToken: discordTokenField,
		messageId: z.string().optional().describe('Fetch a single menu by its Discord message ID.')
	},
	async ({ guildId, discordToken, messageId }) =>
		textResult(await api(`/guilds/${guildId}/reaction-roles`, { token: tokenOf(discordToken), query: { messageId } }))
);

server.tool(
	'helix_reaction_role_create',
	'Create a reaction-role menu record for a guild. Needs MANAGE_GUILD.',
	{
		guildId: guildIdField,
		discordToken: discordTokenField,
		messageId: z.string().describe('Discord message ID backing the menu.'),
		channelId: z.string().describe('Discord channel ID containing the message.'),
		title: z.string(),
		description: z.string().optional(),
		maxSelections: z.number().min(0).optional().describe('0 = unlimited.'),
		roles: z.array(reactionRoleSchema).optional(),
		active: z.boolean().optional()
	},
	async ({ guildId, discordToken, ...body }) =>
		textResult(await api(`/guilds/${guildId}/reaction-roles`, { method: 'POST', token: tokenOf(discordToken), body }))
);

server.tool(
	'helix_reaction_role_update',
	'Update a reaction-role menu (title, description, maxSelections, active, roles). Needs MANAGE_GUILD.',
	{
		guildId: guildIdField,
		discordToken: discordTokenField,
		messageId: z.string().describe('Discord message ID of the menu.'),
		title: z.string().optional(),
		description: z.string().optional(),
		maxSelections: z.number().min(0).optional(),
		active: z.boolean().optional(),
		roles: z.array(reactionRoleSchema).optional().describe('Full replacement of the role list.')
	},
	async ({ guildId, discordToken, ...body }) =>
		textResult(await api(`/guilds/${guildId}/reaction-roles`, { method: 'PATCH', token: tokenOf(discordToken), body }))
);

server.tool(
	'helix_reaction_role_delete',
	'Delete a reaction-role menu. Needs MANAGE_GUILD.',
	{
		guildId: guildIdField,
		discordToken: discordTokenField,
		messageId: z.string().describe('Discord message ID of the menu.')
	},
	async ({ guildId, discordToken, messageId }) =>
		textResult(
			await api(`/guilds/${guildId}/reaction-roles`, { method: 'DELETE', token: tokenOf(discordToken), query: { messageId } })
		)
);

// ---------- Custom messages ----------

server.tool(
	'helix_messages_get',
	'Get custom per-guild messages. Needs MANAGE_GUILD.',
	{ guildId: guildIdField, discordToken: discordTokenField },
	async ({ guildId, discordToken }) => textResult(await api(`/guilds/${guildId}/messages`, { token: tokenOf(discordToken) }))
);

server.tool(
	'helix_messages_update',
	'Merge custom per-guild messages (values max 2000 chars). Needs MANAGE_GUILD.',
	{
		guildId: guildIdField,
		discordToken: discordTokenField,
		messages: z.record(z.string()).describe('Map of message key to text.')
	},
	async ({ guildId, discordToken, messages }) =>
		textResult(await api(`/guilds/${guildId}/messages`, { method: 'PATCH', token: tokenOf(discordToken), body: { messages } }))
);

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch((error) => {
	console.error('Helix MCP server failed to start:', error);
	process.exit(1);
});
