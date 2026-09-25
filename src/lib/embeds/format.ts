/**
 * Pure embed formatting helpers — no models, no config, no database.
 *
 * Split from build.ts on purpose: these are the pieces worth unit-testing, and
 * keeping them free of the mongoose import graph means they can be checked
 * without booting a driver (bson needs v8 APIs Bun does not implement).
 */
import { emojis } from '../../emojimap.json';
import { KEYS, type MessageKey } from '../i18n';

/** Prefix each line with `> ` so it renders as a Discord block quote. */
export function indent(text: string): string {
	return text
		.split('\n')
		.map((line) => (line.trim() === '' ? '> ' : `> ${line}`))
		.join('\n');
}

/**
 * Resolve a dotted path in emojimap.json, e.g. `badges.owner` or `economy.coin`.
 * Returns the fallback when the path is missing or the map holds an empty
 * string, so an incomplete map degrades to unicode instead of to nothing —
 * `emojis.general` and `emojis.economy` are empty objects today.
 */
export function emoji(path: string, fallback = ''): string {
	let node: unknown = emojis;
	for (const part of path.split('.')) {
		if (typeof node !== 'object' || node === null) return fallback;
		node = (node as Record<string, unknown>)[part];
	}
	return typeof node === 'string' && node.length > 0 ? node : fallback;
}

/**
 * `<base>.title` / `<base>.description`, or null when the catalog has no such
 * slot. Null rather than the key string: a base key with no title slot should
 * produce an embed with no title, never one titled "some.key.title".
 */
export function slot(base: string | undefined, suffix: 'title' | 'description'): MessageKey | null {
	if (!base) return null;
	const key = `${base}.${suffix}`;
	return KEYS.has(key) ? (key as MessageKey) : null;
}
