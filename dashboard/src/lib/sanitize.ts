// Client-side mirror of src/lib/utils/sanitize.ts.
// Strips control + invisible/spoof chars before sending, so the server never
// sees bidi overrides, zero-width hiding, or stray carriage returns.
// Server re-validates everything — this is UX, not trust.

const CONTROLS = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F]', 'g');
const INVISIBLE = new RegExp('[\\u200B\\u00AD\\u2060\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]', 'g');

export function stripInvisible(value: string): string {
	return value.replaceAll('\r\n', '\n').replaceAll('\r', '\n').replace(CONTROLS, '').replace(INVISIBLE, '');
}

/** Recursively clean all strings in a JSON-ish payload (arrays + plain objects). */
export function cleanPayload<T>(input: T): T {
	if (typeof input === 'string') return stripInvisible(input) as T;
	if (Array.isArray(input)) return input.map(cleanPayload) as T;
	if (input && typeof input === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(input as Record<string, unknown>)) out[k] = cleanPayload(v);
		return out as T;
	}
	return input;
}

/** Field length caps (mirror the API limits so users get instant feedback). */
export const MAX = {
	prefix: 5,
	short: 100,
	title: 256,
	message: 2000,
	reason: 1000,
	userIds: 32
} as const;
