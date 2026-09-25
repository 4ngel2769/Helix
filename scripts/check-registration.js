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

function walk(dir, keep) {
	const out = [];
	for (const entry of fs.readdirSync(dir)) {
		const full = path.join(dir, entry);
		if (fs.statSync(full).isDirectory()) out.push(...walk(full, keep));
		else if (keep(entry)) out.push(full);
	}
	return out;
}

async function main() {
	const files = walk(COMMANDS_DIR, (e) => e.endsWith('.ts') && !e.endsWith('.d.ts'));
	const problems = [];
	// bun cannot load canvas (-> node:v8), so it only reaches commands that do not
	// import it. Node can, and the compiled dist/ has no TS to trip over, so
	// running this under node covers everything. Both runtimes share passes 1+3.
	const underBun = typeof Bun !== 'undefined';
	const mode = underBun ? 'src (partial: canvas-importing commands skipped)' : 'dist (full)';
	console.log(`mode: ${mode}`);

	// --- pass 1: static, covers every file including ones we cannot import ---
	for (const file of files) {
		const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
		lines.forEach((line, i) => {
			for (const m of line.matchAll(/setName\(\s*'([^']*)'/g)) {
				if (!VALID_NAME.test(m[1])) problems.push(`${file}:${i + 1}  setName('${m[1]}') is not a legal Discord name`);
			}
			// the command's own declared name, e.g. @ApplyOptions({ name: 'set-nick' })
			if (/@ApplyOptions</.test(line)) {
				for (const m of line.matchAll(/name:\s*'([^']*)'/g)) {
					if (!VALID_NAME.test(m[1])) problems.push(`${file}:${i + 1}  command name '${m[1]}' is not a legal Discord name`);
				}
			}
		});
	}

	// --- pass 2: dynamic, actually build every command ---
	// Node path reads dist/ so canvas resolves; bun path reads src/ via import().
	const { SlashCommandBuilder } = require('discord.js');
	const { container } = require('@sapphire/framework');
	// some commands read container.client at registration time (e.g. ping's shard
	// max). Always present in production; absent here.
	if (!container.client) container.client = { shard: null };

	const targets = underBun
		? files.map((f) => ({ file: f, load: () => import(f).catch(() => null) }))
		: (() => {
				const distDir = path.join(__dirname, '..', 'dist', 'commands');
				if (!fs.existsSync(distDir)) {
					console.log('dist/ not found - run `bun run build` first, skipping dynamic pass');
					return [];
				}
				return walk(distDir, (e) => e.endsWith('.js') && !e.endsWith('.d.js')).map((f) => ({
					file: f,
					load: () => {
						try {
							return require(f);
						} catch {
							return null;
						}
					}
				}));
		  })();

	let built = 0;
	let skipped = 0;
	for (const { file, load } of targets) {
		const base = path.basename(file).replace(/\.(ts|js)$/, '');
		if (base.startsWith('_')) continue;
		// Sapphire derives the piece name from the file, so this matches reality for
		// non-index files. index.ts takes its name from @ApplyOptions, which pass 1
		// checks as a literal; a placeholder is fine for structural validation.
		const pieceName = base.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
		const mod = await load();
		if (!mod) {
			skipped++;
			continue;
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

	console.log(`built ${built} command(s) across ${targets.length} file(s), skipped ${skipped} unimportable`);

	// A stale or empty dist/ would make this report a clean pass while checking
	// nothing. Fail loudly instead.
	if (!underBun) {
		if (built === 0) {
			problems.push('dist/ produced 0 commands - the build failed or dist/ is empty. Run `bun run build` and read its errors.');
		}
		const newestSrc = Math.max(...files.map((f) => fs.statSync(f).mtimeMs));
		const distDir = path.join(__dirname, '..', 'dist', 'commands');
		if (fs.existsSync(distDir)) {
			const distFiles = walk(distDir, (e) => e.endsWith('.js') && !e.endsWith('.d.js'));
			const newestDist = Math.max(...distFiles.map((f) => fs.statSync(f).mtimeMs));
			if (newestSrc > newestDist) {
				problems.push('dist/ is older than src/ - this checked stale output. Run `bun run build` first.');
			}
		}
	}
	if (problems.length) {
		console.error(`\n${problems.length} registration problem(s):`);
		for (const p of problems) console.error(`  ${p}`);
		process.exit(1);
	}
	console.log('no registration problems');
}

main();
