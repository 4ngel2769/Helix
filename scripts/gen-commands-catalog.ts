/**
 * Generates `src/lib/data/commands-fallback.ts` for the marketing site:
 * a static snapshot of every real bot command, parsed from the source
 * `@ApplyOptions` blocks and `registerApplicationCommands` calls.
 *
 * Run from the bot repo root:  bun scripts/gen-commands-catalog.ts
 * Output is written into the sibling site repo (Helix-beta-site).
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const BOT_ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SITE_ROOT = join(BOT_ROOT, '..', 'Helix-beta-site');
const COMMANDS_DIR = join(BOT_ROOT, 'src', 'commands');
const OUT_FILE = join(SITE_ROOT, 'src', 'lib', 'data', 'commands-fallback.ts');

interface FallbackOption {
	name: string;
	description: string;
	type: 'subcommand' | 'subcommand_group' | 'string' | 'integer' | 'number' | 'boolean' | 'user' | 'channel' | 'role' | 'mentionable' | 'attachment';
	required: boolean;
	choices?: { name: string; value: string | number }[];
	options?: FallbackOption[];
}

interface FallbackCommand {
	name: string;
	description: string;
	category: string | null;
	module: string | null;
	type: 'slash' | 'user' | 'message';
	aliases: string[];
	requiredUserPermissions: string[];
	requiredClientPermissions: string[];
	cooldownSeconds: number | null;
	disabled: boolean;
	options: FallbackOption[];
}

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, entry.name);
		if (entry.isDirectory()) walk(p, out);
		else if (entry.name.endsWith('.ts')) out.push(p);
	}
	return out;
}

/** Extract the balanced `{...}` body following `@ApplyOptions<...>`. */
function extractApplyOptions(src: string): string | null {
	const idx = src.indexOf('@ApplyOptions');
	if (idx === -1) return null;
	const braceStart = src.indexOf('{', idx);
	if (braceStart === -1) return null;
	let depth = 0;
	for (let i = braceStart; i < src.length; i++) {
		const ch = src[i];
		if (ch === '{') depth++;
		else if (ch === '}') {
			depth--;
			if (depth === 0) return src.slice(braceStart, i + 1);
		}
	}
	return null;
}

/** `name: 'x'` or `setName('x')` — both forms appear in this codebase. */
function extractString(block: string, key: string): string | null {
	const str = String.raw`'[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*"|\x60[^\x60\\]*(?:\\.[^\x60\\]*)*\x60`;
	const prop = block.match(new RegExp(`${key}\\s*:\\s*(${str})`));
	if (prop) return unquote(prop[1]);
	const call = block.match(new RegExp(`${key}\\s*\\(\\s*(${str})\\s*\\)`));
	return call ? unquote(call[1]) : null;
}

function unquote(raw: string): string {
	const inner = raw.slice(1, -1);
	return inner.replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n');
}

function extractStringArray(block: string, key: string): string[] {
	const m = block.match(new RegExp(`${key}\\s*:\\s*\\[([^\\]]*)\\]`));
	if (!m) return [];
	return [...m[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map((x) => x[1]);
}

function extractNumber(block: string, key: string): number | null {
	const m = block.match(new RegExp(`${key}\\s*:\\s*(\\d+)`));
	return m ? Number(m[1]) : null;
}

function extractAliases(block: string): string[] {
	return extractStringArray(block, 'aliases');
}

function extractCategory(block: string, dirName: string): { category: string | null; module: string | null } {
	const full = block.match(/fullCategory\s*:\s*\[([^\]]*)\]/);
	if (full) {
		const first = [...full[1].matchAll(/['"`]([^'"`]+)['"`]/g)][0];
		return { category: first ? first[1] : dirName, module: null };
	}
	const moduleMatch = block.match(/module\s*:\s*['"`]([^'"`]+)['"`]/);
	if (moduleMatch) return { category: dirName, module: moduleMatch[1] };
	return { category: dirName, module: null };
}

/** Parse `.addXOption((option) => option.setName('n').setDescription('d')...)` chains. */
function extractOptions(src: string): FallbackOption[] {
	const out: FallbackOption[] = [];
	const optionCall = /\.(addSubcommand|addSubcommandGroup|addStringOption|addIntegerOption|addNumberOption|addBooleanOption|addUserOption|addChannelOption|addRoleOption|addMentionableOption|addAttachmentOption)\s*\(/g;
	let m: RegExpExecArray | null;
	while ((m = optionCall.exec(src))) {
		const method = m[1];
		// Find matching close paren of this call.
		const parenStart = src.indexOf('(', m.index + m[0].length - 1);
		let depth = 0;
		let end = parenStart;
		for (let i = parenStart; i < src.length; i++) {
			if (src[i] === '(') depth++;
			else if (src[i] === ')') {
				depth--;
				if (depth === 0) { end = i; break; }
			}
		}
		const body = src.slice(parenStart, end + 1);

		const name = extractString(body, 'setName');
		if (!name) continue;
		const description = extractString(body, 'setDescription') ?? '';
		const required = /setRequired\s*\(\s*true\s*\)/.test(body);

		const typeMap: Record<string, FallbackOption['type']> = {
			addSubcommand: 'subcommand',
			addSubcommandGroup: 'subcommand_group',
			addStringOption: 'string',
			addIntegerOption: 'integer',
			addNumberOption: 'number',
			addBooleanOption: 'boolean',
			addUserOption: 'user',
			addChannelOption: 'channel',
			addRoleOption: 'role',
			addMentionableOption: 'mentionable',
			addAttachmentOption: 'attachment'
		};
		const type = typeMap[method] ?? 'string';

		// Choices: .addChoices({ name: 'x', value: 'y' }, ...) or .addChoices([{...}])
		const choices: { name: string; value: string | number }[] = [];
		const choiceRe = /name\s*:\s*['"`]([^'"`]+)['"`]\s*,\s*value\s*:\s*(['"`]?)([^,'"`}]+)\2/g;
		let cm: RegExpExecArray | null;
		while ((cm = choiceRe.exec(body))) {
			const raw = cm[3].trim();
			const num = Number(raw);
			choices.push({ name: cm[1], value: Number.isFinite(num) && raw !== '' ? num : raw });
		}

		// Nested options inside subcommand groups
		const nested = method === 'addSubcommandGroup' ? extractOptions(body) : undefined;

		out.push({
			name,
			description,
			type,
			required,
			...(choices.length ? { choices } : {}),
			...(nested?.length ? { options: nested } : {})
		});
	}
	return out;
}

/** Detect context-menu registrations: registerContextMenuCommand({ name, type: ApplicationCommandType.X }). */
function extractContextMenuTypes(src: string): ('user' | 'message')[] {
	const types: ('user' | 'message')[] = [];
	const re = /registerContextMenuCommand\s*\(\s*\{([^}]*)\}\s*\)/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(src))) {
		const body = m[1];
		if (/ApplicationCommandType\.User/.test(body)) types.push('user');
		else if (/ApplicationCommandType\.Message/.test(body)) types.push('message');
		else if (/type\s*:\s*ApplicationCommandType\.User/.test(body)) types.push('user');
		else if (/type\s*:\s*ApplicationCommandType\.Message/.test(body)) types.push('message');
	}
	return types;
}

const files = walk(COMMANDS_DIR);
const commands: FallbackCommand[] = [];

for (const file of files) {
	const src = readFileSync(file, 'utf8');
	const block = extractApplyOptions(src);
	if (!block) continue;

	const dirName = relative(COMMANDS_DIR, file).split(/[\\/]/)[0];
	const { category, module } = extractCategory(block, dirName);

	const name = extractString(block, 'name');
	const description = extractString(block, 'description') ?? '';
	if (!name) continue;

	const disabled = /enabled\s*:\s*false/.test(block);
	const cooldownSeconds = (() => {
		const delay = extractNumber(block, 'cooldownDelay');
		return delay && delay > 0 ? Math.round(delay / 1000) : null;
	})();

	const contextTypes = extractContextMenuTypes(src);
	const hasSlash = /registerChatInputCommand/.test(src);

	const base = {
		name,
		description,
		category,
		module,
		aliases: extractAliases(block),
		requiredUserPermissions: extractStringArray(block, 'requiredUserPermissions'),
		requiredClientPermissions: extractStringArray(block, 'requiredClientPermissions'),
		cooldownSeconds,
		disabled,
		options: hasSlash ? extractOptions(src) : []
	};

	if (hasSlash) commands.push({ ...base, type: 'slash' });
	for (const t of contextTypes) commands.push({ ...base, type: t, options: [] });
}

commands.sort((a, b) => {
	const c = (a.category ?? 'zzz').localeCompare(b.category ?? 'zzz');
	if (c !== 0) return c;
	if (a.name !== b.name) return a.name.localeCompare(b.name);
	return a.type.localeCompare(b.type);
});

const out = `// AUTO-GENERATED by scripts/gen-commands-catalog.ts — do not edit by hand.
// Static fallback for the /commands page when the live API is unreachable.
// Regenerate: cd Helix && bun scripts/gen-commands-catalog.ts

export interface FallbackOption {
	name: string;
	description: string;
	type: 'subcommand' | 'subcommand_group' | 'string' | 'integer' | 'number' | 'boolean' | 'user' | 'channel' | 'role' | 'mentionable' | 'attachment';
	required: boolean;
	choices?: { name: string; value: string | number }[];
	options?: FallbackOption[];
}

export interface FallbackCommand {
	name: string;
	description: string;
	category: string | null;
	module: string | null;
	type: 'slash' | 'user' | 'message';
	aliases: string[];
	requiredUserPermissions: string[];
	requiredClientPermissions: string[];
	cooldownSeconds: number | null;
	disabled: boolean;
	options: FallbackOption[];
}

export const FALLBACK_COMMANDS: FallbackCommand[] = ${JSON.stringify(commands, null, '\t')};
`;

mkdirSync(join(SITE_ROOT, 'src', 'lib', 'data'), { recursive: true });
writeFileSync(OUT_FILE, out);
console.log(`Wrote ${commands.length} commands → ${OUT_FILE}`);
