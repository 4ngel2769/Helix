import { CARD_BACKGROUNDS, CARD_LAYOUTS, withCardDefaults, type GreetCardConfig } from './cardBackgrounds';
import { isHexColor, sanitizeText } from '../utils/sanitize';

/**
 * Validate + sanitize a greeting-card object.
 * allowPremium=false rejects file (premium) backgrounds — used when saving
 * for non-premium guilds. The preview endpoint allows them so admins can
 * see what they'd get.
 */
export function validateGreetCard(rec: unknown, opts: { allowPremium: boolean }): { card?: GreetCardConfig; error?: string } {
	if (typeof rec !== 'object' || rec === null || Array.isArray(rec)) return { error: 'card must be an object' };
	const r = rec as Record<string, unknown>;
	if (typeof r.enabled !== 'boolean') return { error: 'card.enabled must be a boolean' };
	if (typeof r.background !== 'string' || !CARD_BACKGROUNDS.some((b) => b.key === r.background)) {
		return { error: `card.background must be one of: ${CARD_BACKGROUNDS.map((b) => b.key).join(', ')}` };
	}
	const bg = CARD_BACKGROUNDS.find((b) => b.key === r.background)!;
	if (bg.premium && !opts.allowPremium) return { error: `card.background "${bg.key}" requires premium` };
	if (typeof r.layout !== 'string' || !(CARD_LAYOUTS as readonly string[]).includes(r.layout)) {
		return { error: 'card.layout must be left, center or right' };
	}
	for (const flag of ['showName', 'line1Enabled', 'line2Enabled'] as const) {
		if (typeof r[flag] !== 'boolean') return { error: `card.${flag} must be a boolean` };
	}
	const clean: Record<string, unknown> = {};
	for (const line of ['line1', 'line2'] as const) {
		const c = sanitizeText(r[line], 140);
		if (c === null) return { error: `card.${line} must be text up to 140 chars` };
		clean[line] = c;
	}
	if (!isHexColor(r.textColor)) return { error: 'card.textColor must be a #rrggbb hex color' };
	return { card: { ...withCardDefaults(r), ...clean, textColor: r.textColor as string } as GreetCardConfig };
}
