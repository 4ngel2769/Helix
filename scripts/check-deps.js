/**
 * Catches dependency drift between code and package.json.
 *
 * Two directions, because both break a deploy while still working locally:
 *  1. declared but never imported (dead weight, or a leftover)
 *  2. imported but not declared — resolves from a stale node_modules locally and
 *     fails on `bun install --frozen-lockfile`. That is how @skyra/env-utilities
 *     reached production: it had been dropped from the root package.json, but the
 *     bot's Docker build only installs root deps, so tsc failed on the server while
 *     everything looked fine on the dev machine.
 *
 * Scoped per package root. The root and dashboard/package.json are separate
 * install trees; crediting one to the other is exactly the bug above.
 *
 * Run: bun run check:deps
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Loaded via /register side-effect entrypoints or required by framework internals,
// so no source import is expected. Do not add entries to silence a real finding —
// only to record a dependency that is genuinely loaded another way.
const IMPORTED_ELSEWHERE = {
	'@kaname-png/plugin-subcommands-advanced': 'augments @kbotdev/plugin-modules subcommand groups',
	'@sapphire/discord-utilities': 'framework internals, re-exported by discord.js-utilities',
	'@sapphire/discord.js-utilities': 'framework requires it directly for isDMChannel',
	'@sapphire/plugin-hmr': 'loaded via its /register side-effect entrypoint',
	'@sapphire/plugin-subcommands': 'loaded via its /register side-effect entrypoint',
	'jose': 'loaded by the dashboard OAuth/API proxy at runtime'
};

function walk(dir, out = []) {
	if (!fs.existsSync(dir)) return out;
	for (const entry of fs.readdirSync(dir)) {
		const full = path.join(dir, entry);
		if (fs.statSync(full).isDirectory()) {
			if (entry === 'node_modules' || entry === 'dist' || entry === 'build') continue;
			walk(full, out);
		} else if (/\.(ts|js|mjs|svelte)$/.test(entry)) out.push(full);
	}
	return out;
}

function readPkg(file) {
	if (!fs.existsSync(file)) return {};
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8'));
	} catch {
		return {};
	}
}

/** Drop comment-only lines so a commented-out import is not counted as a real one.
 * Only whole-line comments: stripping inline comments would truncate on the "//"
 * inside every URL string. */
function stripCommentLines(text) {
	return text
		.split(/\r?\n/)
		.filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
		.join('\n');
}

const problems = [];

function checkScope(label, base, sourceDirs, pkgFile) {
	const sources = sourceDirs.flatMap((d) => walk(path.join(base, d)));
	if (sources.length === 0) return;
	const haystack = sources.map((f) => stripCommentLines(fs.readFileSync(f, 'utf8'))).join('\n');
	const pkg = readPkg(path.join(base, pkgFile));
	const deps = Object.keys(pkg.dependencies ?? {});
	const declared = new Set([...deps, ...Object.keys(pkg.devDependencies ?? {})]);

	// 1. declared but never imported
	for (const name of deps) {
		const used = haystack.includes(`'${name}'`) || haystack.includes(`"${name}"`) || haystack.includes(`'${name}/`);
		if (!used && !IMPORTED_ELSEWHERE[name]) {
			problems.push(`[${label}] ${name}@${pkg.dependencies[name]} is declared but nothing imports it.`);
		}
	}

	// 2. imported but not declared
	for (const m of haystack.matchAll(/(?:from|import|require\()\s*'((?:@[^/]+\/)?[^/'"]+)'/g)) {
		const name = m[1];
		if (name.startsWith('.') || name.startsWith('node:')) continue;
		if (declared.has(name)) continue;
		// only a problem if it is actually present in this tree's node_modules,
		// i.e. it resolves today by accident
		if (fs.existsSync(path.join(base, 'node_modules', name))) {
			problems.push(`[${label}] source imports '${name}' but ${pkgFile} does not declare it — resolves from a stale node_modules and will fail a fresh install.`);
		}
	}
}

checkScope('bot', ROOT, ['src', 'scripts'], 'package.json');
checkScope('dashboard', path.join(ROOT, 'dashboard'), ['src', 'server'], 'package.json');

if (problems.length) {
	console.error(`${problems.length} dependency problem(s):`);
	for (const p of problems) console.error(`  ${p}`);
	process.exit(1);
}
console.log('no dependency problems');
