import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { ApplicationCommandType, PermissionsBitField, type PermissionResolvable } from 'discord.js';
import { setPublicApiHeaders } from '../../lib/utils/publicApiCors';

/**
 * Public command catalog for the marketing site's /commands page.
 *
 * Two layers are merged per entry:
 * - `commands`: every application-command registration (chat input, user
 *   context menu, message context menu) with its full option tree taken from
 *   the registry's normalized `builtData` — subcommands, groups, choices,
 *   autocomplete flags and Discord `default_member_permissions` included.
 * - `pieces`: the Sapphire command piece's own metadata (category, module,
 *   aliases, cooldown, `requiredUserPermissions`/`requiredClientPermissions`
 *   preconditions, enabled flag) joined in by name.
 */

interface OptionNode {
	type: number;
	name: string;
	description?: string;
	required?: boolean;
	choices?: Array<{ name: string; value: unknown }>;
	options?: OptionNode[];
	autocomplete?: boolean;
	min_value?: number;
	max_value?: number;
	min_length?: number;
	max_length?: number;
	channel_types?: number[];
}

interface AppCommandEntry {
	name: string;
	description?: string;
	type: number;
	category: string | null;
	module: string | null;
	options: OptionNode[];
	defaultMemberPermissions: string | null;
	dmPermission: boolean | null;
	global: boolean;
	guildIds: string[];
}

interface PieceMeta {
	name: string;
	description: string;
	category: string | null;
	module: string | null;
	aliases: string[];
	cooldown: { delayMs: number; limit: number } | null;
	requiredUserPermissions: string[];
	requiredClientPermissions: string[];
	enabled: boolean;
}

const COMMAND_TYPE_NAMES: Record<number, string> = {
	[ApplicationCommandType.ChatInput]: 'slash',
	[ApplicationCommandType.User]: 'user',
	[ApplicationCommandType.Message]: 'message',
	[ApplicationCommandType.PrimaryEntryPoint]: 'primary-entry-point'
};

function commandTypeName(type: number): string {
	return COMMAND_TYPE_NAMES[type] ?? `type-${type}`;
}

function normalizePermissions(value: unknown): string[] {
	if (value === undefined || value === null) return [];
	try {
		const bitfield = new PermissionsBitField(value as PermissionResolvable);
		if (bitfield.bitfield === 0n) return [];
		return bitfield.toArray();
	} catch {
		// Already an array of strings, a bigint, or something unparseable —
		// pass strings through, drop the rest.
		const list = Array.isArray(value) ? value : [value];
		return list.filter((entry): entry is string => typeof entry === 'string');
	}
}

function pieceMeta(piece: any): PieceMeta | null {
	const name = typeof piece?.name === 'string' ? piece.name : null;
	if (!name) return null;

	const options = piece.options ?? {};
	const fullCategory: unknown = options.fullCategory ?? piece.fullCategory;
	const firstCategory = Array.isArray(fullCategory) && fullCategory.length > 0 ? String(fullCategory[0]) : null;
	const dirCategory =
		typeof piece.location?.directory === 'string'
			? (piece.location.directory.split(/[\\/]/).pop() as string | undefined) ?? null
			: (piece.category ?? null);
	const module =
		typeof options.module === 'string' ? options.module : typeof piece.module === 'string' ? piece.module : null;

	const cooldownDelay = typeof options.cooldownDelay === 'number' ? options.cooldownDelay : 0;
	const cooldownLimit = typeof options.cooldownLimit === 'number' ? options.cooldownLimit : 0;

	return {
		name,
		description: typeof piece.description === 'string' ? piece.description : '',
		category: firstCategory ?? dirCategory ?? null,
		module,
		aliases: Array.isArray(piece.aliases) ? piece.aliases.filter((a: unknown) => typeof a === 'string') : [],
		cooldown: cooldownDelay > 0 && cooldownLimit > 0 ? { delayMs: cooldownDelay, limit: cooldownLimit } : null,
		requiredUserPermissions: normalizePermissions(options.requiredUserPermissions),
		requiredClientPermissions: normalizePermissions(options.requiredClientPermissions),
		enabled: piece.enabled !== false
	};
}

function collectPieces(client: any): Map<string, PieceMeta> {
	const map = new Map<string, PieceMeta>();
	try {
		const store = client.stores?.get?.('commands');
		if (!store) return map;
		for (const cmd of store.values()) {
			const meta = pieceMeta(cmd);
			if (meta) map.set(meta.name.toLowerCase(), meta);
		}
	} catch {
		// ignore — return whatever was collected
	}
	return map;
}

function collectCommands(client: any, pieces: Map<string, PieceMeta>): AppCommandEntry[] {
	const out: AppCommandEntry[] = [];
	const seen = new Set<string>();

	const push = (pieceName: string | null, builtData: any, type: number, registerOptions: any) => {
		const name = typeof builtData?.name === 'string' ? builtData.name : null;
		if (!name) return;
		// A piece may register the same name for multiple types (ping =
		// slash + user menu + message menu). Dedupe on name+type so each
		// registration shows once.
		const key = `${name}:${type}`;
		if (seen.has(key)) return;
		seen.add(key);

		const piece = pieceName ? pieces.get(pieceName.toLowerCase()) : undefined;
		const guildIds = Array.isArray(registerOptions?.guildIds)
			? registerOptions.guildIds.filter((id: unknown) => typeof id === 'string')
			: [];

		out.push({
			name,
			description: typeof builtData.description === 'string' ? builtData.description : undefined,
			type,
			category: piece?.category ?? null,
			module: piece?.module ?? null,
			options: Array.isArray(builtData.options) ? builtData.options : [],
			defaultMemberPermissions:
				typeof builtData.default_member_permissions === 'string' && builtData.default_member_permissions !== '0'
					? builtData.default_member_permissions
					: null,
			dmPermission: typeof builtData.dm_permission === 'boolean' ? builtData.dm_permission : null,
			global: guildIds.length === 0,
			guildIds
		});
	};

	try {
		const store = client.stores?.get?.('commands');
		if (!store) return out;
		for (const cmd of store.values()) {
			const piece: any = cmd;
			const registry = Reflect.get(piece, 'applicationCommandRegistry') as
				| { apiCalls?: Array<{ builtData?: any; registerOptions?: any; type?: number }> }
				| undefined;
			const calls = registry?.apiCalls ?? [];
			for (const call of calls) {
				const builtData = call?.builtData;
				if (!builtData) continue;
				const type =
					typeof builtData.type === 'number'
						? builtData.type
						: call.type === 1
							? ApplicationCommandType.User // fallback only; builtData.type is normally always set
							: ApplicationCommandType.ChatInput;
				push(typeof piece.name === 'string' ? piece.name : null, builtData, type, call.registerOptions);
			}
		}
	} catch {
		// ignore — return whatever was collected
	}

	// Merge piece-level metadata into each command entry by name.
	for (const entry of out) {
		const piece = pieces.get(entry.name.toLowerCase());
		if (!piece) continue;
		entry.category = entry.category ?? piece.category;
		entry.module = entry.module ?? piece.module;
	}

	return out.sort((a, b) => {
		const cat = (a.category ?? 'zzz').localeCompare(b.category ?? 'zzz');
		if (cat !== 0) return cat;
		if (a.name !== b.name) return a.name.localeCompare(b.name);
		return a.type - b.type;
	});
}

@ApplyOptions<RouteOptions>({
	name: 'api-commands',
	route: 'commands',
	methods: ['GET', 'OPTIONS']
})
export class ApiCommandsRoute extends Route {
	public override run(_request: ApiRequest, response: ApiResponse) {
		setPublicApiHeaders(response);

		const client = this.container.client as any;
		const pieces = collectPieces(client);
		const commands = collectCommands(client, pieces);

		return response.json({
			total: commands.length,
			pieces: [...pieces.values()],
			commands: commands.map((cmd) => ({
				...cmd,
				typeName: commandTypeName(cmd.type)
			}))
		});
	}
}
