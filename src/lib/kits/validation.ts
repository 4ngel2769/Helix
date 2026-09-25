/**
 * Message-kit validation. This is a trust boundary: kits are authored in the
 * dashboard by server moderators and can be shared publicly with a link, so a
 * kit from an untrusted author must never be able to do anything a Helix
 * message could not do anyway.
 *
 * The model is deliberately boring — a kit is a flat `Record<key, string>` of
 * literal text. There is no expression evaluation, no nesting, no user-supplied
 * pattern and no way to reference anything outside PLACEHOLDERS, so there is no
 * "code" half to inject. The rules below exist to stop a kit from being an
 * attack on the *rest* of the embed:
 *
 *  1. Keys must already exist in locales/en.json. A kit can reword a slot, not
 *     invent one, which caps the blast radius to strings the bot already sends.
 *  2. Only tokens from PLACEHOLDERS may appear, so a kit cannot smuggle in
 *     nested `{{...}}` that would re-enter the renderer.
 *  3. Raw mentions are rejected. `@here` / `@everyone` / `<@id>` in a template
 *     is a mass-ping primitive; mentions must arrive via a placeholder, which
 *     the renderer injects after validation.
 *  4. URLs are rejected. Kits set text only — the embed builder owns every
 *     URL, colour and image — so a shared kit cannot turn Helix output into a
 *     phishing link.
 *  5. Prototype keys are rejected outright, so a kit document can never poison
 *     Object.prototype through a merge.
 *
 * `scrubTemplate` re-applies 3 and 4 on the way OUT, so a kit that reached Mongo
 * by some other route (a dev script, a hand-edited document) still cannot ping.
 */
import { sanitizeText, stripInvisible } from '../utils/sanitize';
import { KEYS, PLACEHOLDER_TOKENS, type MessageKey } from '../i18n';

// Two forms of each pattern: a non-global one for `.test()` in the validation
// loop (a `g` regex is stateful through `lastIndex` and would alternate true /
// false across iterations) and a global one for `.replace()`, which otherwise
// strips only the FIRST occurrence in a template.
//
// The URL form consumes the whole link, not just its scheme — leaving
// "evil.example" behind as text is not a de-fanged URL, it is a typo.
const RAW_MENTION_SRC = '@(?:here|everyone)|<@[!&]?\\d{16,22}>';
const URL_LIKE_SRC = '(?:https?:\\/\\/|www\\.|discord(?:app)?\\.gg\\/|<a?:)\\S*';
const RAW_MENTION = new RegExp(RAW_MENTION_SRC, 'i');
const RAW_MENTION_ALL = new RegExp(RAW_MENTION_SRC, 'gi');
const URL_LIKE = new RegExp(URL_LIKE_SRC, 'i');
const URL_LIKE_ALL = new RegExp(URL_LIKE_SRC, 'gi');
const ANY_TOKEN = /\{\{[^}]*\}\}/g;

// MAX_KEYS is an early bail on a hostile body. The real cap on distinct keys is
// the catalog itself (rule 1), but without this a 10k-key payload walks the whole
// loop before the 20-error slice truncates the output.
const MAX_KEYS = 200;
const MAX_VALUE_LENGTH = 1000;
const MAX_TOTAL_LENGTH = 64_000;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 48;
const MAX_DESCRIPTION_LENGTH = 200;

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export type KitMessages = Partial<Record<MessageKey, string>>;

export type MessageMapResult = { ok: true; messages: KitMessages } | { ok: false; errors: string[] };

export type KitValidation = { ok: true; messages: KitMessages; name: string; description: string } | { ok: false; errors: string[] };

/**
 * Strip everything a shared kit must not be able to do to a rendered message.
 * Applied on import and again on render, so it is the last line of defence
 * rather than the only one.
 */
export function scrubTemplate(value: string): string {
	return value.replace(RAW_MENTION_ALL, '').replace(URL_LIKE_ALL, '');
}

/** True when every `{{token}}` in the template is one the renderer knows. */
function tokensAreKnown(template: string): boolean {
	for (const match of template.matchAll(ANY_TOKEN)) {
		const token = match[0].slice(2, -2).trim();
		if (!PLACEHOLDER_TOKENS.has(token)) return false;
	}
	return true;
}

export interface KitDraft {
	name?: unknown;
	description?: unknown;
	/** Source of the messages — a request body field, or an untrusted import. */
	messages?: unknown;
}

/**
 * Validate a bare `{ key: template }` map. This is the shared entry point:
 * per-guild overrides (`CustomMessage`), kit authoring and kit import all go
 * through it, because a moderator typing into a welcome-message box is the
 * same trust problem as someone importing a shared kit.
 */
export function validateMessages(raw: unknown): MessageMapResult {
	const errors: string[] = [];

	if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
		return { ok: false, errors: ['messages must be an object of key -> template'] };
	}

	const source = raw as Record<string, unknown>;
	const entries = Object.entries(source);

	if (entries.length === 0) errors.push('messages must not be empty');
	if (entries.length > MAX_KEYS) errors.push(`messages allows max ${MAX_KEYS} keys`);

	const messages: KitMessages = {};
	let totalLength = 0;

	for (const [key, value] of entries) {
		if (FORBIDDEN_KEYS.has(key)) {
			errors.push(`"${key}" is a reserved key`);
			continue;
		}
		// Rule 1: the English catalog is the key registry.
		if (!KEYS.has(key)) {
			errors.push(`"${key}" is not a known message key`);
			continue;
		}
		if (value === null || value === undefined || value === '') {
			// An empty value means "revert this key to the default", which is
			// how the editor deletes an override.
			continue;
		}
		if (typeof value !== 'string') {
			errors.push(`${key} must be a string`);
			continue;
		}

		const clean = sanitizeText(value, MAX_VALUE_LENGTH);
		if (clean === null) {
			errors.push(`${key} must be at most ${MAX_VALUE_LENGTH} characters`);
			continue;
		}
		if (!tokensAreKnown(clean)) {
			errors.push(`${key} uses an unknown placeholder`);
			continue;
		}
		if (RAW_MENTION.test(clean)) {
			errors.push(`${key} may not contain @here, @everyone or raw user mentions`);
			continue;
		}
		if (URL_LIKE.test(clean)) {
			errors.push(`${key} may not contain links`);
			continue;
		}

		totalLength += clean.length;
		messages[key as MessageKey] = clean;
	}

	if (totalLength > MAX_TOTAL_LENGTH) errors.push(`messages exceed ${MAX_TOTAL_LENGTH} characters in total`);

	if (errors.length > 0) return { ok: false, errors: errors.slice(0, 20) };
	return { ok: true, messages };
}

/**
 * Validate a full kit draft (name + description + messages). Collects every
 * problem rather than failing on the first so the dashboard editor can
 * highlight all of them at once.
 */
export function validateKit(draft: KitDraft): KitValidation {
	const errors: string[] = [];

	const name = sanitizeText(draft.name, MAX_NAME_LENGTH);
	if (!name || name.length < MIN_NAME_LENGTH) errors.push(`name must be ${MIN_NAME_LENGTH}-${MAX_NAME_LENGTH} characters`);

	let description = '';
	if (draft.description !== undefined && draft.description !== null && draft.description !== '') {
		const clean = sanitizeText(draft.description, MAX_DESCRIPTION_LENGTH);
		if (clean === null) errors.push(`description must be text up to ${MAX_DESCRIPTION_LENGTH} chars`);
		else description = clean;
	}

	const parsed = validateMessages(draft.messages);
	if (!parsed.ok) return { ok: false, errors: parsed.errors };
	if (errors.length > 0) return { ok: false, errors };

	return { ok: true, messages: parsed.messages, name: name as string, description };
}

/**
 * Re-apply the outbound rules to a whole message map. Cheap enough to run on
 * every render, and the reason a dirty document in Mongo is still inert.
 */
export function scrubMessages(messages: Record<string, string> | null | undefined): Record<string, string> {
	const out: Record<string, string> = Object.create(null);
	if (!messages) return out;
	for (const [key, value] of Object.entries(messages)) {
		if (!KEYS.has(key) || typeof value !== 'string') continue;
		out[key] = scrubTemplate(stripInvisible(value));
	}
	return out;
}
