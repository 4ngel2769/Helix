/**
 * The shared Helix embed builder.
 *
 * Every command used to hand-roll `new EmbedBuilder()`, which is why formatting
 * drifted: some indented field values with `>`, some didn't, footers were typed
 * out per command (and three of them were mojibake). This is the one place that
 * decides what a Helix embed looks like.
 *
 * What it owns:
 *  - `> ` indentation for body text, so a description under a title reads as
 *    secondary rather than competing with it
 *  - colour, from the guild's brand profile, falling back to config
 *  - the standard `Mod: … · <date>` footer, localised
 *  - emoji lookup through src/emojimap.json
 *
 * What it deliberately does NOT own: URLs. Kits and callers set text only, so a
 * shared kit cannot turn a Helix embed into a phishing link.
 */
import { EmbedBuilder, type APIEmbedField, type ColorResolvable } from 'discord.js';
import config from '../../config';
import { fmt, t, type MessageKey, type Vars } from '../i18n';
import { getGuildStrings } from '../i18n/guildStrings';
import { scrubTemplate } from '../kits/validation';
import { emoji, indent, slot } from './format';

export { emoji, indent, slot };

export type ColorName = keyof typeof config.bot.embedColor;

export function brandColor(guildId?: string | null, name: ColorName = 'default'): ColorResolvable {
	const profile = config.bot.embedColor[name] ?? config.bot.embedColor.default;
	return (profile as ColorResolvable) ?? 0x3b66ff;
}

export interface FieldSpec {
	/** Catalog key for the field name, e.g. `economy.balance.field.wallet`. */
	nameKey?: MessageKey;
	/** Literal field name, for text the catalog does not carry yet. */
	name?: string;
	value: string;
	inline?: boolean;
	/** Render the value as an indented quote block. Default true. */
	quote?: boolean;
}

export interface HelixEmbedSpec {
	/**
	 * Base key; `<key>.title` and `<key>.description` are looked up from it.
	 * Verified at runtime by `slot()` — a base with no such slot is ignored
	 * rather than rendered as the literal string "some.key.title".
	 */
	key?: string;
	title?: string;
	description?: string;
	fields?: FieldSpec[];
	/** Values for `{{...}}` interpolation across the whole embed. */
	vars?: Vars;
	color?: ColorResolvable;
	thumbnail?: string;
	/** `Mod: … · <date>` footer. Default true when `mod` is in vars. */
	footer?: boolean;
	timestamp?: boolean;
	/** Indent the description. Default true. */
	quote?: boolean;
}

const EMPTY_SOURCE = { locale: undefined, kit: null, overrides: null } as const;

function fieldName(field: FieldSpec, vars: Vars): string {
	if (field.nameKey) return t(field.nameKey, EMPTY_SOURCE, vars);
	return field.name ?? '';
}

function buildValue(value: string, quote: boolean): string {
	const clean = scrubTemplate(value);
	return quote ? indent(clean) : clean;
}

/**
 * Build a Helix embed, resolving every string through the guild's locale, kit
 * and overrides. `guildId` is what selects the language; omit it for global
 * output (DM flows, health checks) and you get English.
 */
export async function helixEmbed(guildId: string | null | undefined, spec: HelixEmbedSpec): Promise<EmbedBuilder> {
	const strings = await getGuildStrings(guildId);
	const vars = { ...spec.vars };
	if (vars.datetime === undefined) vars.datetime = new Date();

	const embed = new EmbedBuilder().setColor(spec.color ?? brandColor(guildId));

	const titleKey = slot(spec.key, 'title');
	if (spec.title) embed.setTitle(scrubTemplate(spec.title));
	else if (titleKey) embed.setTitle(scrubTemplate(t(titleKey, strings, vars)));

	const descriptionKey = slot(spec.key, 'description');
	if (spec.description) {
		const clean = scrubTemplate(spec.description);
		embed.setDescription(spec.quote === false ? clean : indent(clean));
	} else if (descriptionKey) {
		const clean = scrubTemplate(t(descriptionKey, strings, vars));
		embed.setDescription(spec.quote === false ? clean : indent(clean));
	}

	const fields: APIEmbedField[] = [];
	for (const field of spec.fields ?? []) {
		const value = buildValue(field.value, field.quote !== false);
		if (!value.trim()) continue;
		fields.push({ name: fieldName(field, vars).slice(0, 256), value: value.slice(0, 1024), inline: field.inline ?? true });
	}
	if (fields.length > 0) embed.addFields(fields);

	if (spec.thumbnail) embed.setThumbnail(spec.thumbnail);

	const wantsFooter = spec.footer ?? 'mod.tag' in vars;
	if (wantsFooter) {
		const footer = t('mod.tag' in vars ? 'common.footer' : 'common.footerNoMod', strings, vars);
		if (footer) embed.setFooter({ text: scrubTemplate(footer).slice(0, 2048) });
	}

	if (spec.timestamp ?? true) embed.setTimestamp();

	return embed;
}

/** Convenience for precondition / error paths: a red ephemeral error embed. */
export async function errorEmbed(guildId: string | null | undefined, key: MessageKey, vars?: Vars): Promise<EmbedBuilder> {
	return helixEmbed(guildId, {
		color: brandColor(guildId, 'err'),
		title: '⚠️',
		description: t(key, await getGuildStrings(guildId), vars),
		quote: false,
		footer: false
	});
}

export { fmt };
