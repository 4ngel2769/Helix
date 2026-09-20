import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { draftBanReason } from '../../lib/services/ReasonDrafter';
import { isSnowflake, readJsonBody, requireAuth, requireDev } from '../../lib/utils/apiAuth';
import { sanitizeText } from '../../lib/utils/sanitize';

/**
 * Dev-only: draft an internal ban/disable reason with the private Ollama
 * instance. POST { kind: 'guild'|'user', targetId, targetName?, context? }.
 * The draft is returned for review — nothing is stored here. Requires OWNER_IDS.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-dev-ai',
	route: 'dev/ai-draft',
	methods: ['POST']
})
export class ApiDevAiRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;
		const dev = await requireDev(auth, response);
		if (!dev) return undefined;

		const body = await readJsonBody<Record<string, unknown>>(request);
		const kind = body.kind === 'guild' || body.kind === 'user' ? body.kind : null;
		const targetId = typeof body.targetId === 'string' ? body.targetId : null;
		const targetName = sanitizeText(body.targetName ?? targetId ?? 'unknown', 100) ?? 'unknown';
		const context = sanitizeText(body.context ?? '', 500) ?? '';
		if (!kind || !targetId || !isSnowflake(targetId)) {
			return response.status(400).json({ error: "kind ('guild'|'user') and targetId (snowflake) are required" });
		}

		try {
			const raw = await draftBanReason({ kind, targetName, targetId, context });
			const draft = sanitizeText(raw, 1000) ?? raw.slice(0, 1000);
			return response.json({ draft });
		} catch {
			return response.status(502).json({ error: 'AI unavailable — is Ollama reachable? Write the reason manually.' });
		}
	}
}
