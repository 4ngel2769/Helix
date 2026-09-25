/**
 * Helix i18n + message-kit resolution.
 *
 * One call site, one chain:
 *   1. per-guild ad-hoc override   (CustomMessage.messages)
 *   2. per-guild active kit        (MessageKit, may have been imported/shared)
 *   3. guild locale catalog        (locales/<locale>.json, partial by design)
 *   4. English catalog             (locales/en.json == the "Helix Default" kit)
 *
 * The English catalog is the KEY REGISTRY: a key that isn't in en.json is not a
 * valid key, and message kits may not introduce new ones. That single rule is
 * what stops a shared kit from inventing strings the bot never renders.
 *
 * Kits are DATA, never code. There is no expression evaluation, no nesting and
 * no user-supplied regex — only literal text plus tokens from PLACEHOLDERS.
 * Do not add an `{{eval}}`.
 */
import { container } from '@sapphire/framework';
import config from '../../config';
import en from '../../../locales/en.json';
import fr from '../../../locales/fr.json';
import es from '../../../locales/es.json';
import ro from '../../../locales/ro.json';

export type MessageKey = keyof typeof en;
export const KEYS: ReadonlySet<string> = new Set(Object.keys(en));

export const LOCALES = {
	en: { name: 'English', nativeName: 'English', flag: '🇬🇧', intl: 'en-US' },
	fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷', intl: 'fr-FR' },
	es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', intl: 'es-ES' },
	ro: { name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', intl: 'ro-RO' }
} as const;

export type Locale = keyof typeof LOCALES;
export const LOCALE_CODES = Object.keys(LOCALES) as Locale[];
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && Object.hasOwn(LOCALES, value);
}

type Catalog = Partial<Record<MessageKey, string>>;
const CATALOG: Record<Locale, Catalog> = { en, fr, es, ro };

/**
 * Every token a template may contain. The kit validator rejects any `{{...}}`
 * outside this set, so this is a closed vocabulary rather than documentation.
 */
export const PLACEHOLDERS = {
	'user.id': 'Raw user id (no mention)',
	'user.mention': 'Pings the user, e.g. <@123>',
	'user.name': "User's server display name",
	'user.tag': "User's account username",
	'mod.id': 'Moderator id',
	'mod.mention': 'Pings the moderator',
	'mod.name': "Moderator's display name",
	'mod.tag': "Moderator's account username",
	'target.id': 'Target member id',
	'target.mention': 'Pings the target member',
	'target.name': "Target's display name",
	'target.tag': "Target's account username",
	'server.name': 'Server name',
	'server.members': 'Current member count',
	'server.ordinal': 'Ordinal member count, e.g. 1st',
	'supportServer.name': 'Helix support server name',
	'supportServer.invite': 'Helix support server invite',
	'supportServer.count': 'Helix support server member count',
	'channel.name': 'Channel name',
	'channel.id': 'Channel id',
	'role.name': 'Role name',
	'permission': 'Missing permission, human readable',
	'reason': 'Stated reason',
	'duration': 'Human-readable duration, e.g. 10m',
	'count': 'A number',
	'amount': 'A currency amount',
	'value': 'A free-form value',
	'usage': 'Correct command usage',
	'prefix': "This server's command prefix",
	'command': 'Command name',
	'shard': 'Shard id',
	'date': 'Localized date',
	'time': 'Localized time',
	'datetime': 'Localized date and time'
} as const;

export type Placeholder = keyof typeof PLACEHOLDERS;
export const PLACEHOLDER_TOKENS: ReadonlySet<string> = new Set(Object.keys(PLACEHOLDERS));

export const PLACEHOLDER_DOC = Object.entries(PLACEHOLDERS).map(([token, description]) => ({ token: `{{${token}}}`, description }));

/** Strict, single-pass token match. Rejects anything that is not `{{ a.b }}`. */
const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\s*\}\}/g;

export type Vars = Record<string, string | number | Date>;

export interface StringSource {
	/** Guild locale; anything unknown falls back to DEFAULT_LOCALE. */
	locale?: string | null | undefined;
	/** Messages from the guild's active kit. */
	kit?: Record<string, string> | null | undefined;
	/** Per-key ad-hoc overrides, highest priority. */
	overrides?: Record<string, string> | null | undefined;
}

const EMPTY: StringSource = {};

function localeOf(source: StringSource): Locale {
	return isLocale(source.locale) ? source.locale : DEFAULT_LOCALE;
}

const numberFormats = new Map<string, Intl.NumberFormat>();
function numberFormat(locale: Locale): Intl.NumberFormat {
	let fmt = numberFormats.get(locale);
	if (!fmt) {
		fmt = new Intl.NumberFormat(LOCALES[locale].intl);
		numberFormats.set(locale, fmt);
	}
	return fmt;
}

const dateFormats = new Map<string, Intl.DateTimeFormat>();
function dateFormat(locale: Locale, withTime: boolean): Intl.DateTimeFormat {
	const cacheKey = `${locale}:${withTime}`;
	let fmt = dateFormats.get(cacheKey);
	if (!fmt) {
		fmt = new Intl.DateTimeFormat(LOCALES[locale].intl, withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
		dateFormats.set(cacheKey, fmt);
	}
	return fmt;
}

/** Locale-aware value formatting for the `{{date}}` / `{{time}}` / `{{datetime}}` slots. */
export const fmt: {
	number(value: number, locale: string | null | undefined): string;
	date(value: Date | number | string, locale: string | null | undefined): string;
	time(value: Date | number | string, locale: string | null | undefined): string;
	datetime(value: Date | number | string, locale: string | null | undefined): string;
} = {
	number: (value, locale) => numberFormat(isLocale(locale) ? locale : DEFAULT_LOCALE).format(value),
	date: (value, locale) => dateFormat(isLocale(locale) ? locale : DEFAULT_LOCALE, false).format(toDate(value)),
	time: (value, locale) => new Intl.DateTimeFormat(isLocale(locale) ? locale : DEFAULT_LOCALE, { timeStyle: 'short' }).format(toDate(value)),
	datetime: (value, locale) => dateFormat(isLocale(locale) ? locale : DEFAULT_LOCALE, true).format(toDate(value))
};

function toDate(value: Date | number | string): Date {
	return value instanceof Date ? value : new Date(value);
}

function render(template: string, vars: Vars, locale: Locale): string {
	return template.replace(TOKEN_RE, (match, token: string) => {
		if (!(token in vars)) return match;
		const value = vars[token];
		switch (token) {
			// Numbers and dates go through Intl so a French guild sees "12 345"
			// and a Romanian one "12.345" with no per-locale template. Note the
			// template itself may contain no digits at all ("Mod: {{mod.tag}} ·
			// {{datetime}}") — the substitution still has to run.
			case 'date':
				return fmt.date(value, locale);
			case 'time':
				return fmt.time(value, locale);
			case 'datetime':
				return fmt.datetime(value, locale);
			default:
				return typeof value === 'number' ? numberFormat(locale).format(value) : String(value);
		}
	});
}

/**
 * Resolve a key through the override/kit/locale chain and interpolate vars.
 * Unknown keys return the key itself rather than an empty string — a blank
 * embed is invisible, a visible `some.key` is a bug report.
 */
export function t(key: MessageKey, source: StringSource = EMPTY, vars?: Vars): string {
	if (!KEYS.has(key)) return key;
	const locale = localeOf(source);
	const template = source.overrides?.[key] ?? source.kit?.[key] ?? CATALOG[locale][key] ?? en[key] ?? key;
	return render(template, vars ?? {}, locale);
}

/** True when a guild or kit has its own wording for this key. */
export function isOverridden(key: MessageKey, source: StringSource): boolean {
	return Boolean(source.overrides?.[key] ?? source.kit?.[key]);
}

/** Support-server vars, so `error.guild.disabled` needs no second template engine. */
export function supportVars(): Vars {
	const supportGuild = config.support.serverId ? container.client?.guilds.cache.get(config.support.serverId) : undefined;
	return {
		'supportServer.name': supportGuild?.name ?? t('common.supportServer'),
		'supportServer.invite': config.support.invite,
		'supportServer.count': supportGuild?.memberCount ?? 0
	};
}
