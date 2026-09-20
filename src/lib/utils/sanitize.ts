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

function intInRange(v: unknown, min: number, max: number): number | null {
	return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null;
}

function snowflakeArray(v: unknown, max: number): string[] | null {
	if (!Array.isArray(v) || v.length > max) return null;
	const out = [...new Set(v)];
	if (!out.every((x) => typeof x === 'string' && /^\d{16,22}$/.test(x))) return null;
	return out;
}

/** Validate + clean the leveling settings object in place. Returns an error string or null. */
export function cleanLeveling(update: Record<string, unknown>): string | null {
	const v = update.leveling as Record<string, unknown> | null;
	if (v === null || typeof v !== 'object' || Array.isArray(v)) return 'leveling must be an object';
	if ('enabled' in v && typeof v.enabled !== 'boolean') return 'leveling.enabled must be a boolean';
	for (const [key, min, max] of [['xpMin', 1, 1000], ['xpMax', 1, 1000], ['cooldownSeconds', 0, 3600]] as const) {
		if (!(key in v)) continue;
		const n = intInRange(v[key], min, max);
		if (n === null) return `leveling.${key} must be an integer ${min}-${max}`;
		v[key] = n;
	}
	if ('xpMin' in v && 'xpMax' in v && (v.xpMin as number) > (v.xpMax as number)) return 'leveling.xpMin must not exceed leveling.xpMax';
	if ('levelUpChannelId' in v && v.levelUpChannelId !== null && (typeof v.levelUpChannelId !== 'string' || !/^\d{16,22}$/.test(v.levelUpChannelId))) {
		return 'leveling.levelUpChannelId must be null or a Discord id';
	}
	if ('levelUpMessage' in v) {
		if (v.levelUpMessage !== null) {
			const clean = sanitizeText(v.levelUpMessage, 500);
			if (!clean) return 'leveling.levelUpMessage must be null or text up to 500 chars';
			v.levelUpMessage = clean;
		}
	}
	for (const key of ['ignoredChannels', 'ignoredRoles'] as const) {
		if (!(key in v)) continue;
		const arr = snowflakeArray(v[key], 200);
		if (!arr) return `leveling.${key} must be an array of up to 200 Discord ids`;
		v[key] = arr;
	}
	if ('roleRewards' in v) {
		const t = v.roleRewards;
		if (!Array.isArray(t) || t.length > 25) return 'leveling.roleRewards must be an array of max 25';
		const seen = new Set<number>();
		for (const entry of t) {
			if (typeof entry !== 'object' || entry === null) return 'leveling.roleRewards entries must be objects';
			const rec = entry as Record<string, unknown>;
			const level = intInRange(rec.level, 2, 1000);
			if (level === null || seen.has(level)) return 'leveling.roleRewards[].level must be a unique integer 2-1000';
			seen.add(level);
			if (typeof rec.roleId !== 'string' || !/^\d{16,22}$/.test(rec.roleId)) return 'leveling.roleRewards[].roleId must be a Discord id';
		}
	}
	if ('stackRewards' in v && typeof v.stackRewards !== 'boolean') return 'leveling.stackRewards must be a boolean';
	return null;
}

const AUTOMOD_ACTIONS = ['delete', 'delete_warn', 'delete_timeout'] as const;

/** Validate + clean the Helix custom automod settings object in place. Returns an error string or null. */
export function cleanAutomodSettings(update: Record<string, unknown>): string | null {
	const v = update.automodSettings as Record<string, unknown> | null;
	if (v === null || typeof v !== 'object' || Array.isArray(v)) return 'automodSettings must be an object';
	if ('enabled' in v && typeof v.enabled !== 'boolean') return 'automodSettings.enabled must be a boolean';
	for (const key of ['blockInvites', 'blockLinks', 'zalgo'] as const) {
		if (key in v && typeof v[key] !== 'boolean') return `automodSettings.${key} must be a boolean`;
	}
	for (const [key, fields] of [['caps', ['minLength', 5, 500, 'percent', 10, 100]], ['emoji', ['max', 1, 100]], ['spam', ['count', 2, 20, 'intervalSeconds', 2, 120]]] as const) {
		if (!(key in v)) continue;
		const sub = v[key] as Record<string, unknown> | null;
		if (sub === null || typeof sub !== 'object' || Array.isArray(sub)) return `automodSettings.${key} must be an object`;
		if ('enabled' in sub && typeof sub.enabled !== 'boolean') return `automodSettings.${key}.enabled must be a boolean`;
		const nums = fields as unknown as Array<string | number>;
		for (let i = 0; i < nums.length; i += 3) {
			const field = nums[i] as string;
			const min = nums[i + 1] as number;
			const max = nums[i + 2] as number;
			if (!(field in sub)) continue;
			const n = intInRange(sub[field], min, max);
			if (n === null) return `automodSettings.${key}.${field} must be an integer ${min}-${max}`;
			sub[field] = n;
		}
	}
	for (const key of ['ignoredChannels', 'ignoredRoles'] as const) {
		if (!(key in v)) continue;
		const arr = snowflakeArray(v[key], 200);
		if (!arr) return `automodSettings.${key} must be an array of up to 200 Discord ids`;
		v[key] = arr;
	}
	if ('action' in v && (typeof v.action !== 'string' || !(AUTOMOD_ACTIONS as readonly string[]).includes(v.action))) {
		return 'automodSettings.action must be delete, delete_warn or delete_timeout';
	}
	if ('timeoutSeconds' in v) {
		const n = intInRange(v.timeoutSeconds, 10, 2419200);
		if (n === null) return 'automodSettings.timeoutSeconds must be an integer 10-2419200';
		v.timeoutSeconds = n;
	}
	return null;
}
