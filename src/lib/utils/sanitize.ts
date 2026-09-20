/**
 * Shared input sanitization for anything a dashboard user can type.
 * Threats handled: C0/C1 control chars, bidi-override spoofing (U+202A-2E,
 * U+2066-69), zero-width space / BOM / soft-hyphen hiding text, over-long
 * strings (DB bloat, Discord limit blowups), non-https URLs (thumb/avatar
 * fields), off-palette colors.
 *
 * NOTE: U+200D (ZWJ) is intentionally kept — emoji sequences need it.
 * Svelte auto-escapes `{...}` output and Mongoose queries are parameterized,
 * so this layer focuses on what those don't cover.
 *
 * Character classes use the RegExp constructor so this file stays pure ASCII.
 */

const CONTROLS = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F]', 'g');
const INVISIBLE = new RegExp('[\\u200B\\u00AD\\u2060\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]', 'g');

export function stripInvisible(value: string): string {
	return value.replaceAll('\r\n', '\n').replaceAll('\r', '\n').replace(CONTROLS, '').replace(INVISIBLE, '');
}

/** Trim + strip; null when not a string or over maxLength. Empty string is allowed (means "use default" for message fields). */
export function sanitizeText(value: unknown, maxLength: number): string | null {
	if (typeof value !== 'string') return null;
	const clean = stripInvisible(value).trim();
	return clean.length > maxLength ? null : clean;
}

/**
 * Mutate a PATCH-style update object: null stays null (clear the field),
 * strings get sanitized, anything else (or over-limit) yields an error.
 */
export function cleanNullableText(update: Record<string, unknown>, key: string, maxLength: number): string | null {
	if (!(key in update) || update[key] === undefined) return null;
	const value = update[key];
	if (value === null) return null;
	const clean = sanitizeText(value, maxLength);
	if (clean === null) return `${key} must be null or text up to ${maxLength} chars`;
	update[key] = clean;
	return null;
}

const AUTOMOD_LISTS = ['profanity', 'scams', 'phishing', 'custom'] as const;

/** Validate + clean automodKeywords in place. Returns an error string or null. */
export function cleanAutomodKeywords(update: Record<string, unknown>): string | null {
	const v = update.automodKeywords as Record<string, unknown> | null;
	if (v === null || typeof v !== 'object' || Array.isArray(v)) return 'automodKeywords must be an object';
	for (const list of AUTOMOD_LISTS) {
		if (!(list in v)) continue;
		const arr = v[list];
		if (!Array.isArray(arr)) return `automodKeywords.${list} must be an array`;
		if (arr.length > 300) return `automodKeywords.${list} allows max 300 entries`;
		const clean: string[] = [];
		for (const item of arr) {
			if (typeof item !== 'string') return `automodKeywords.${list} must be strings`;
			const c = stripInvisible(item).trim().slice(0, 60);
			if (c) clean.push(c);
		}
		v[list] = [...new Set(clean)];
	}
	return null;
}

const WARN_ACTIONS = ['kick', 'ban', 'timeout'] as const;

/** Validate warnSettings shape. Returns an error string or null. */
export function cleanWarnSettings(update: Record<string, unknown>): string | null {
	const v = update.warnSettings as Record<string, unknown> | null;
	if (v === null || typeof v !== 'object' || Array.isArray(v)) return 'warnSettings must be an object';
	if ('thresholds' in v) {
		const t = v.thresholds;
		if (!Array.isArray(t) || t.length > 20) return 'warnSettings.thresholds must be an array of max 20';
		for (const entry of t) {
			if (typeof entry !== 'object' || entry === null) return 'warnSettings.thresholds entries must be objects';
			const rec = entry as Record<string, unknown>;
			if (!Number.isInteger(rec.count) || (rec.count as number) < 1 || (rec.count as number) > 99) {
				return 'warnSettings.thresholds[].count must be an integer 1-99';
			}
			if (typeof rec.action !== 'string' || !(WARN_ACTIONS as readonly string[]).includes(rec.action)) {
				return 'warnSettings.thresholds[].action must be kick, ban or timeout';
			}
			if (rec.duration !== undefined && rec.duration !== null && (!Number.isInteger(rec.duration) || (rec.duration as number) < 1 || (rec.duration as number) > 40320)) {
				return 'warnSettings.thresholds[].duration must be 1-40320 minutes';
			}
		}
	}
	if ('modChannelId' in v && v.modChannelId !== null && (typeof v.modChannelId !== 'string' || !/^\d{16,22}$/.test(v.modChannelId))) {
		return 'warnSettings.modChannelId must be null or a Discord id';
	}
	return null;
}

/** https/http URL allowlist for image fields (thumbnails, avatars). */
export function isSafeImageUrl(value: string, maxLength = 512): boolean {
	if (value.length === 0 || value.length > maxLength) return false;
	try {
		const url = new URL(value);
		return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.');
	} catch {
		return false;
	}
}

/** #rrggbb hex color. */
export function isHexColor(value: unknown): value is string {
	return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}
