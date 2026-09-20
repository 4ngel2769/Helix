import { container } from '@sapphire/framework';
import config from '../../config';

export interface DraftInput {
	kind: 'guild' | 'user';
	targetName: string;
	targetId: string;
	context: string;
}

const SYSTEM = [
	'You write short internal moderation notes for a Discord bot owner.',
	'Given a server or user and a few context words, write a clear 1-3 sentence record of WHY access was removed.',
	'Neutral tone, factual, no formatting, no greetings, no advice, plain text only.'
].join(' ');

/**
 * Ask the private Ollama instance to draft an internal ban/disBan reason.
 * Server-side only — output is sanitized by the caller before storage.
 * Throws on timeout/unreachable so the route can answer 502.
 */
export async function draftBanReason(input: DraftInput): Promise<string> {
	const prompt =
		`${SYSTEM}\n\nTarget (${input.kind}): ${input.targetName} [${input.targetId}]\n` +
		`Owner context: ${input.context || '(none given)'}\n\nModeration note:`;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 45_000);
	try {
		const res = await fetch(config.ollama.url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ model: config.ollama.defaultModel, prompt, stream: false }),
			signal: controller.signal
		});
		if (!res.ok) throw new Error(`Ollama answered ${res.status}`);
		const data = (await res.json()) as { response?: unknown };
		const text = typeof data.response === 'string' ? data.response.trim() : '';
		if (!text) throw new Error('Ollama returned an empty draft');
		return text.slice(0, 1000);
	} catch (error) {
		container.logger.warn('[reason-drafter] Ollama draft failed:', error instanceof Error ? error.message : error);
		throw error;
	} finally {
		clearTimeout(timer);
	}
}
