export class ApiError extends Error {
	status: number;
	data: unknown;

	constructor(status: number, data: unknown) {
		super(typeof data === 'object' && data !== null && 'error' in data ? String((data as Record<string, unknown>).error) : `Request failed (${status})`);
		this.status = status;
		this.data = data;
	}
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
	const search = new URLSearchParams();
	if (query) {
		for (const [key, value] of Object.entries(query)) {
			if (value !== undefined) search.set(key, String(value));
		}
	}
	const qs = search.toString();
	return `/api/bot${path}${qs ? `?${qs}` : ''}`;
}

export async function api<T = unknown>(
	path: string,
	options: { method?: string; body?: unknown; query?: Record<string, string | number | boolean | undefined> } = {}
): Promise<T> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 20000);
	let res: Response;
	try {
		res = await fetch(buildUrl(path, options.query), {
			method: options.method ?? 'GET',
			headers: { 'content-type': 'application/json' },
			body: options.body === undefined ? undefined : JSON.stringify(options.body),
			signal: controller.signal
		});
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') {
			throw new Error('Request timed out after 20s — is the bot API reachable?');
		}
		throw error;
	} finally {
		clearTimeout(timer);
	}
	const text = await res.text();
	let data: unknown = text;
	try {
		data = text ? JSON.parse(text) : null;
	} catch {
		// keep raw text
	}
	if (!res.ok) throw new ApiError(res.status, data);
	return data as T;
}

export async function inviteUrl(guildId?: string): Promise<string> {
	const qs = guildId ? `?guildId=${encodeURIComponent(guildId)}` : '';
	const res = await fetch(`/api/invite-url${qs}`);
	if (!res.ok) throw new Error('Failed to build invite URL');
	const data = (await res.json()) as { url: string };
	return data.url;
}
