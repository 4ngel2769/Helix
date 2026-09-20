export interface PremiumDoc {
	isPremium?: boolean;
	premiumExpiresAt?: Date | string | null;
}

/**
 * Single source of truth for "does this guild/user currently have premium".
 * Missing expiry = permanent (all grants made before expiry existed).
 */
export function isPremiumActive(doc: PremiumDoc | null | undefined): boolean {
	if (!doc || doc.isPremium !== true) return false;
	if (!doc.premiumExpiresAt) return true;
	return new Date(doc.premiumExpiresAt).getTime() > Date.now();
}

export function premiumExpiryIso(doc: PremiumDoc | null | undefined): string | null {
	const v = doc?.premiumExpiresAt;
	if (!v) return null;
	const t = new Date(v).getTime();
	return Number.isNaN(t) ? null : new Date(t).toISOString();
}
