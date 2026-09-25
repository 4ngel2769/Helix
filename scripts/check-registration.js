/**
 * Catches application commands that silently fail to register.
 *
 * A throw inside `registerApplicationCommands` makes Sapphire skip that one
 * command; the rest still register, so the only symptom is a command missing
 * from the Discord UI. Two real cases found by this script: `setName` of a
 * camelCase module key (option names must be lowercase) and `addSubcommandGroup`
 * returning the parent instead of the group, which pushed 26 subcommands onto
 * the root and blew the 25 limit.
 *
 * Run: bun run check:registration
 */
const fs = require('fs');
const path = require('path');

const COMMANDS_DIR = path.join(__dirname, '..', 'src', 'commands');
// Discord: lowercase letters/marks, numbers (Devanagari, Thai), _ and -
const VALID_NAME = /^[\p{Ll}\p{Lm}\p{Lo}\p{N}\p{sc=Devanagari}\p{sc=Thai}_-]+$/u;

function walk(dir) {
	const out = [];
	for (const entry of fs.readdirSync(dir)) {
		const full = path.join(dir, entry);
		if (fs.statSync(full).isDirectory()) out.push(...walk(full));
		else if (entry.endsWith('.ts')) out.push(full);
	}
	return out;
}

async function main() {
	const files = walk(COMMANDS_DIR);
	const problems = [];

	// --- pass 1: static, covers every file including ones bun cannot import ---
	for (const file of files) {
		const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
		lines.forEach((line, i) => {
			for (const m of line.matchAll(/setName\(\s*'([^']*)'/g)) {
				if (!VALID_NAME.test(m[1])) problems.push(`${file}:${i + 1}  setName('${m[1]}') is not a legal Discord name`);
			}
		});
	}

	// --- pass 2: dynamic, actually build every command we can import ---
	const { SlashCommandBuilder } = require('discord.js');
	let built = 0;
	let skipped = 0;
	for (const file of files) {
		const base = path.basename(file, '.ts');
		if (base.startsWith('_')) continue;
		const pieceName = base.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
		let mod;
		try {
			mod = await import(file);
		} catch {
			skipped++;
			continue; // pulls in canvas -> node:v8, unsupported under bun.
		}
		for (const [exportName, cls] of Object.entries(mod)) {
			if (typeof cls !== 'function' || !cls.prototype?.registerApplicationCommands) continue;
			const captured = [];
			const registry = {
				registerChatInputCommand: (cb) => captured.push(cb),
				registerContextMenuCommand: () => {},
				registerUserContextMenuCommand: () => {}
			};
			try {
				const instance = Object.create(cls.prototype);
				instance.name = pieceName;
				instance.description = 'desc';
				instance.registerApplicationCommands(registry);
				for (const cb of captured) {
					const builder = new SlashCommandBuilder();
					cb(builder);
					builder.toJSON(); // discord.js validates names and lengths here
				}
				built++;
			} catch (error) {
				problems.push(`${file} (${exportName})  ${String(error && error.message).split('\n')[0]}`);
			}
		}
	}

	// --- pass 3: option names built from module keys are invisible to pass 1
	// (variable argument) and often to pass 2 (setup.ts imports canvas). A module
	// key like `reactionRoles` is not a legal Discord name, so it must always go
	// through moduleOptionName() on BOTH the setName and getString sides.
	for (const file of files) {
		const text = fs.readFileSync(file, 'utf8');
		for (const m of text.matchAll(/for \(const (\w+) of getAllModuleKeys\(\)\)/g)) {
			const key = m[1];
			if (new RegExp(`setName\\(\\s*${key}\\s*\\)`).test(text)) {
				problems.push(`${file}  setName(${key}) uses a raw module key — Discord option names must be lowercase, use moduleOptionName()`);
			}
			if (new RegExp(`getString\\(\\s*${key}\\s*\\)`).test(text)) {
				problems.push(`${file}  getString(${key}) reads a raw module key — must match the lowercased name written by moduleOptionName()`);
			}
		}
	}

	console.log(`built ${built} command(s) across ${files.length} file(s), skipped ${skipped} unimportable`);
	if (problems.length) {
		console.error(`\n${problems.length} registration problem(s):`);
		for (const p of problems) console.error(`  ${p}`);
		process.exit(1);
	}
	console.log('no registration problems');
}

main();
