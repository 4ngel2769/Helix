/**
 * Self-check for the i18n resolution chain and the kit trust boundary.
 * Run: bun scripts/check-i18n.js
 *
 * The kit rules are a security boundary, so they get a check that fails loudly
 * rather than a code review someone has to remember to do.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const en = read('locales/en.json');
const fr = read('locales/fr.json');
const es = read('locales/es.json');
const ro = read('locales/ro.json');
const modules = await import(join(root, 'src/lib/i18n/index.ts'));
const kits = await import(join(root, 'src/lib/kits/validation.ts'));
const { t, fmt, KEYS, isLocale, DEFAULT_LOCALE } = modules;

let passed = 0;
const check = (name, fn) => {
	try {
		fn();
		passed++;
	} catch (error) {
		console.error(`FAIL  ${name}\n      ${error.message}`);
		process.exitCode = 1;
	}
};

// ---------------------------------------------------------------- catalogs
check('en is non-empty and every value is a string', () => {
	assert.ok(Object.keys(en).length > 20);
	for (const [k, v] of Object.entries(en)) assert.equal(typeof v, 'string', `${k} is not a string`);
});

check('non-default locales only use known keys (no orphan translations)', () => {
	for (const [name, cat] of Object.entries({ fr, es, ro })) {
		for (const k of Object.keys(cat)) assert.ok(KEYS.has(k), `${name} has unknown key "${k}"`);
	}
});

check('non-default locales are genuinely partial, so fallback is exercised', () => {
	for (const [name, cat] of Object.entries({ fr, es, ro })) {
		assert.ok(Object.keys(cat).length < Object.keys(en).length, `${name} is not partial`);
	}
});

check('no catalog value uses a placeholder outside the registry', async () => {
	const { PLACEHOLDER_TOKENS } = modules;
	for (const [locale, cat] of Object.entries({ en, fr, es, ro })) {
		for (const [k, v] of Object.entries(cat)) {
			for (const m of v.matchAll(/\{\{([^}]*)\}\}/g)) {
				assert.ok(PLACEHOLDER_TOKENS.has(m[1].trim()), `${locale}:${k} uses unknown token "${m[1].trim()}"`);
			}
		}
	}
});

// ------------------------------------------------------------- resolution
check('defaults to English', () => {
	assert.equal(t('error.mod.only', {}, {}), en['error.mod.only']);
	assert.equal(t('error.mod.only', { locale: 'klingon' }, {}), en['error.mod.only']);
	assert.equal(DEFAULT_LOCALE, 'en');
});

check('unknown locale falls back instead of throwing', () => {
	assert.equal(isLocale('de'), false);
	assert.equal(isLocale('fr'), true);
	assert.equal(t('error.mod.only', { locale: 'de' }, {}), en['error.mod.only']);
});

check('guild locale is used when the key is translated', () => {
	assert.equal(t('error.mod.only', { locale: 'fr' }, {}), fr['error.mod.only']);
	assert.equal(t('error.mod.only', { locale: 'ro' }, {}), ro['error.mod.only']);
});

check('untranslated key falls back to English, not to the key', () => {
	// fr has no economy.balance.field.diamonds
	assert.equal(t('economy.balance.field.diamonds', { locale: 'fr' }, {}), en['economy.balance.field.diamonds']);
});

check('unknown key returns the key, never an empty string', () => {
	// A blank embed is invisible; a visible key is a bug report.
	assert.equal(t('does.not.exist', {}, {}), 'does.not.exist');
	assert.notEqual(t('does.not.exist', {}, {}), '');
});

check('kit beats locale, overrides beat kit', () => {
	const kit = { 'error.mod.only': 'KIT' };
	const overrides = { 'error.mod.only': 'OVERRIDE' };
	assert.equal(t('error.mod.only', { locale: 'fr', kit }, {}), 'KIT');
	assert.equal(t('error.mod.only', { locale: 'fr', kit, overrides }, {}), 'OVERRIDE');
});

check('__proto__ in an override map cannot be read back', () => {
	// Reading obj['__proto__'] on a plain object yields Object.prototype, not
	// undefined — the KEYS guard is what stops that becoming a render value.
	const overrides = JSON.parse('{"__proto__": "polluted"}');
	assert.equal(t('error.mod.only', { overrides }, {}), en['error.mod.only']);
	assert.equal(t('constructor', { overrides }, {}), 'constructor');
});

check('unresolved tokens are left visible rather than blanked', () => {
	assert.equal(t('greeting.welcome', {}, { 'user.mention': '<@1>' }), 'Welcome <@1> to **{{server.name}}**! You are member #{{server.ordinal}}.');
});

// ------------------------------------------------------------ placeholders
check('numbers are locale-formatted', () => {
	assert.equal(fmt.number(1234567, 'en'), '1,234,567');
	assert.notEqual(fmt.number(1234567, 'fr'), '1,234,567');
	assert.notEqual(fmt.number(1234567, 'ro'), fmt.number(1234567, 'en'));
});

check('dates are locale-formatted', () => {
	const d = new Date(Date.UTC(2026, 0, 15, 12, 0));
	// Compare real locales — an unknown tag like 'en-GB' is deliberately
	// normalised to the default, so it is not a valid contrast here.
	assert.notEqual(fmt.date(d, 'en'), fmt.date(d, 'fr'));
	assert.notEqual(fmt.date(d, 'en'), fmt.date(d, 'ro'));
	assert.notEqual(fmt.datetime(d, 'en'), fmt.datetime(d, 'es'));
});

check('the footer slot substitutes datetime even with no literal digits', () => {
	// Regression: a "no digits in template" fast path left {{datetime}} raw.
	const out = t('common.footer', {}, { 'mod.tag': 'ada', datetime: new Date(Date.UTC(2026, 0, 15)) });
	assert.ok(!out.includes('{{'), `footer left a raw token: ${out}`);
	assert.ok(out.startsWith('Mod: ada · '), out);
});

// ---------------------------------------------------------------- security
const goodKit = { name: 'Aurora', messages: { 'error.mod.only': 'Only {{role.name}} can do that.' } };

check('accepts a well-formed kit', () => {
	const r = kits.validateKit(goodKit);
	assert.equal(r.ok, true, r.ok ? '' : r.errors.join('; '));
	assert.equal(r.ok && r.messages['error.mod.only'], 'Only {{role.name}} can do that.');
});

check('rejects keys the bot never sends', () => {
	const r = kits.validateKit({ name: 'X', messages: { 'evil.inject': 'hi' } });
	assert.equal(r.ok, false);
	assert.match(r.ok ? '' : r.errors.join(), /not a known message key/);
});

check('enforces size limits', () => {
	assert.equal(kits.validateKit({ name: 'X', messages: { 'error.mod.only': 'x'.repeat(1001) } }).ok, false);
	assert.equal(kits.validateKit({ name: 'X', messages: {} }).ok, false);
	assert.equal(kits.validateKit({ name: 'ab', messages: { 'error.mod.only': 'x' } }).ok, true);
	// The 200-key early bail is unreachable via known keys (the catalog caps
	// those), so it has to be exercised with junk.
	const flood = Object.fromEntries(Array.from({ length: 250 }, (_, i) => [`junk.key.${i}`, 'x']));
	assert.equal(kits.validateKit({ name: 'X', messages: flood }).ok, false);
});

check('rejects mass-ping primitives in templates', () => {
	for (const bad of ['@everyone get banned', 'ping @here now', 'hey <@123456789012345678>']) {
		const r = kits.validateKit({ name: 'X', messages: { 'error.mod.only': bad } });
		assert.equal(r.ok, false, `accepted: ${bad}`);
	}
});

check('scrubTemplate removes EVERY occurrence, not just the first', () => {
	// Regression: a non-global .replace() only stripped the first mention.
	const dirty = '@everyone and @here and <@123456789012345678>';
	const clean = kits.scrubTemplate(dirty);
	assert.equal(clean.includes('@everyone'), false, clean);
	assert.equal(clean.includes('@here'), false, clean);
	assert.equal(clean.includes('<@'), false, clean);
	// Two links in one template must both go.
	assert.equal(kits.scrubTemplate('https://a.example https://b.example').includes('https://'), false);
	assert.equal(kits.scrubTemplate('https://a.example https://b.example').includes('.example'), false);
});

check('the .test() forms are not stateful across the validation loop', () => {
	// A `g` regex reused with .test() alternates true/false via lastIndex,
	// which would let every second bad message through.
	const many = Object.fromEntries(Object.keys(en).map((k) => [k, '@everyone']));
	assert.equal(kits.validateKit({ name: 'X', messages: many }).ok, false);
});

check('rejects links so a shared kit cannot phish', () => {
	for (const bad of ['see https://evil.example', 'discord.gg/steal', '<a:role:123>']) {
		const r = kits.validateKit({ name: 'X', messages: { 'error.mod.only': bad } });
		assert.equal(r.ok, false, `accepted: ${bad}`);
	}
});

check('rejects unknown placeholders', () => {
	const r = kits.validateKit({ name: 'X', messages: { 'error.mod.only': '{{eval}} {{user.secret}}' } });
	assert.equal(r.ok, false);
	assert.match(r.ok ? '' : r.errors.join(), /unknown placeholder/);
});

check('rejects prototype keys', () => {
	for (const k of ['__proto__', 'constructor', 'prototype']) {
		const r = kits.validateKit({ name: 'X', messages: { [k]: 'x' } });
		assert.equal(r.ok, false, `accepted ${k}`);
	}
});

check('a kit covering every known key is still accepted', () => {
	// The catalog is the key cap, not MAX_KEYS — a full override set is valid.
	const all = Object.fromEntries(Object.keys(en).map((k) => [k, 'x']));
	assert.equal(kits.validateKit({ name: 'Full override', messages: all }).ok, true);
});

check('rejects non-object and non-string shapes', () => {
	assert.equal(kits.validateKit({ name: 'X', messages: 'nope' }).ok, false);
	assert.equal(kits.validateKit({ name: 'X', messages: [] }).ok, false);
	assert.equal(kits.validateKit({ name: 'X', messages: { 'error.mod.only': 42 } }).ok, false);
});

// ------------------------------------------------- outbound scrub (defence)
check('scrubTemplate neutralises a dirty document that bypassed validation', () => {
	// A kit written straight into Mongo by a dev script must still be inert.
	assert.equal(kits.scrubTemplate('@everyone run this').includes('@everyone'), false);
	// The whole link goes, not just the scheme — "evil.example" left as bare
	// text is still a de-fanged-but-confusing URL.
	assert.equal(kits.scrubTemplate('go to https://evil.example/x').includes('evil.example'), false);
	assert.equal(kits.scrubTemplate('ping <@123456789012345678>').includes('<@'), false);
});


check('scrubMessages keeps only known keys', () => {
	const out = kits.scrubMessages({ 'error.mod.only': 'ok', 'evil.key': 'no', 'error.guild.banned': '@everyone' });
	assert.deepEqual(Object.keys(out).sort(), ['error.guild.banned', 'error.mod.only']);
	assert.equal(out['error.guild.banned'].includes('@everyone'), false);
});

// ------------------------------------------------------------ embed builder
// format.ts is deliberately mongoose-free so it can be checked here; helixEmbed
// itself needs the model graph and is covered by check:registration + runtime.
const embeds = await import(join(root, 'src/lib/embeds/format.ts'));

check('indent block-quotes every line', () => {
	assert.equal(embeds.indent('one\ntwo'), '> one\n> two');
	assert.equal(embeds.indent(''), '> ');
});

check('emoji() walks the map and degrades to the fallback', () => {
	assert.equal(embeds.emoji('badgesBlurple.owner'), '<:crown:899903075148505119>');
	// The map has a partially filled `badges` — a miss must not render as an
	// empty string, or every field name silently loses its emoji.
	assert.equal(embeds.emoji('economy.coin', '💰'), '🪙');
	assert.equal(embeds.emoji('badges.owner', '👑'), '👑');
	assert.equal(embeds.emoji('nope.nope.nope', '🎯'), '🎯');
	assert.equal(embeds.emoji('badges.owner'), '');
});

check('every module resolves an emoji that actually renders', async () => {
	// The module configs used to hold bare snowflakes, which Discord does not
	// accept as an EmojiIdentifierResolvable and which rendered as digits.
	const { getAllModuleKeys, moduleEmoji } = await import(join(root, 'src/config/modules.ts'));
	for (const key of getAllModuleKeys()) {
		const value = moduleEmoji(key);
		assert.ok(value.length > 0, `${key} has no emoji`);
		assert.doesNotMatch(value, /^\d+$/, `${key} is a bare snowflake, not an emoji`);
		assert.doesNotMatch(value, /:(\d+)>$/, `${key} looks like a custom emoji with a missing name`);
	}
});

check('slot() returns null for a base with no such slot', () => {
	assert.equal(embeds.slot('mod.ban', 'title'), 'mod.ban.title');
	// `error.mod.only` exists but has no .title — the embed must get no title
	// rather than a literal "error.mod.only.title".
	assert.equal(embeds.slot('error.mod.only', 'title'), null);
	assert.equal(embeds.slot('nope.not.here', 'description'), null);
	assert.equal(embeds.slot(undefined, 'title'), null);
});

// -------------------------------------------------------------------- done
console.log(`check-i18n: ${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}`);
