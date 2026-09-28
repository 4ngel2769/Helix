import { Events, Listener } from '@sapphire/framework';

/**
 * Discord answers a rejected bulk overwrite with `50035 Invalid Form Body` and
 * nothing else useful: the stock log prints the message and discards the body,
 * which is where the offending field path lives. Every pre-deploy gate passes
 * on this payload, so without this the deploy only ever learns "400 happened".
 *
 * The listener name must stay in sync with the emitted event name.
 */
export class UserEvent extends Listener<typeof Events.ApplicationCommandRegistriesBulkOverwriteError> {
	public override run(error: unknown, guildId: string | null) {
		const { logger } = this.container;
		const scope = guildId ? `guild ${guildId}` : 'global';

		logger.error(`Slash command registration FAILED for ${scope} commands — no commands were registered.`);

		// discord.js wraps the parsed body in `rawError`; the HTTP body itself is
		// the only place the field path shows up.
		const raw = (error as { rawError?: unknown; code?: number }) ?? {};
		const body = (raw.rawError ?? {}) as { code?: number; message?: string; errors?: unknown };

		if (body.errors && typeof body.errors === 'object') {
			// `errors` is keyed by the exact path that failed, e.g.
			// "commands.12.options.3.name" -> { _errors: [{ code, message }] }
			for (const [field, detail] of Object.entries(body.errors as Record<string, { _errors?: { code: string; message: string }[] }>)) {
				const reasons = (detail?._errors ?? []).map((e) => `${e.code}: ${e.message}`).join('; ');
				logger.error(`  rejected field "${field}"${reasons ? ` — ${reasons}` : ''}`);
			}
		} else {
			logger.error('  (no `errors` object in the response body)');
		}

		// Full body last: it is long, and the per-field lines above are the part
		// anyone actually reads.
		logger.error(`  full response: ${JSON.stringify(body)}`);

		if (typeof raw.code === 'number' && raw.code !== 50035) {
			logger.error(`  (error code ${raw.code} — not the usual 50035)`);
		}
	}
}
