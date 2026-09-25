/** Procedural card backgrounds. No external assets — the renderer paints gradients. */

export interface CardBackground {
	key: string;
	label: string;
	premium: boolean;
	/** File in src/db/assets/cards/ — painted cover-fit; gradient stops are the fallback. */
	file?: string;
	/** [x0, y0, x1, y1] gradient vector in 900x300 space + color stops. */
	stops: Array<{ at: number; color: string }>;
	/** Base color used for text-contrast checks. */
	base: string;
	/** Accent for decorative shapes. */
	accent: string;
}

export const CARD_BACKGROUNDS: CardBackground[] = [
	{ key: 'midnight', label: 'Midnight', premium: false, base: '#1a1b2e', accent: '#3b66ff', stops: [{ at: 0, color: '#1a1b2e' }, { at: 1, color: '#3b3f7a' }] },
	{ key: 'ocean', label: 'Ocean', premium: false, base: '#062a3a', accent: '#22d3ee', stops: [{ at: 0, color: '#062a3a' }, { at: 1, color: '#0e7490' }] },
	{ key: 'sunset', label: 'Sunset', premium: false, base: '#3a1c2e', accent: '#fb923c', stops: [{ at: 0, color: '#3a1c2e' }, { at: 1, color: '#c2410c' }] },
	{ key: 'forest', label: 'Forest', premium: false, base: '#0d2b1d', accent: '#4ade80', stops: [{ at: 0, color: '#0d2b1d' }, { at: 1, color: '#166534' }] },
	{ key: 'nebula', label: 'Nebula', premium: false, base: '#2e1065', accent: '#e879f9', stops: [{ at: 0, color: '#2e1065' }, { at: 1, color: '#86198f' }] },
	{ key: 'gold', label: 'Royal Gold', premium: false, base: '#292004', accent: '#facc15', stops: [{ at: 0, color: '#292004' }, { at: 1, color: '#a16207' }] },
	{ key: 'crimson', label: 'Crimson', premium: false, base: '#2a0a0a', accent: '#f87171', stops: [{ at: 0, color: '#2a0a0a' }, { at: 1, color: '#991b1b' }] },
	{ key: 'mono', label: 'Mono Light', premium: false, base: '#e8e8ec', accent: '#6366f1', stops: [{ at: 0, color: '#f4f4f6' }, { at: 1, color: '#c7c9d4' }] },
	{ key: 'card1', label: 'Card 1', premium: true, file: 'card1.png', base: '#14532d', accent: '#4ade80', stops: [{ at: 0, color: '#14532d' }, { at: 1, color: '#22c55e' }] },
	{ key: 'card2', label: 'Card 2', premium: true, file: 'card2.png', base: '#1e3a8a', accent: '#a3e635', stops: [{ at: 0, color: '#1e3a8a' }, { at: 1, color: '#0ea5e9' }] },
	{ key: 'card3', label: 'Card 3', premium: true, file: 'card3.png', base: '#155e75', accent: '#fb923c', stops: [{ at: 0, color: '#155e75' }, { at: 1, color: '#f59e0b' }] },
	{ key: 'card4', label: 'Card 4', premium: true, file: 'card4.png', base: '#3b0764', accent: '#e879f9', stops: [{ at: 0, color: '#3b0764' }, { at: 1, color: '#a21caf' }] }
];

export function getBackground(key: string): CardBackground {
	return CARD_BACKGROUNDS.find((b) => b.key === key) ?? CARD_BACKGROUNDS[0]!;
}

export const CARD_LAYOUTS = ['left', 'center', 'right'] as const;
export type CardLayout = (typeof CARD_LAYOUTS)[number];

export interface GreetCardConfig {
	enabled: boolean;
	background: string;
	layout: CardLayout;
	showName: boolean;
	line1: string;
	line1Enabled: boolean;
	line2: string;
	line2Enabled: boolean;
	textColor: string;
}

export const DEFAULT_GREET_CARD: GreetCardConfig = {
	enabled: false,
	background: 'midnight',
	layout: 'left',
	showName: true,
	line1: 'User {{user.name}} is the {{server.ordinal}} member!',
	line2: 'Welcome to {{server.name}}',
	line1Enabled: true,
	line2Enabled: true,
	textColor: '#ffffff'
};

export function withCardDefaults(raw: unknown): GreetCardConfig {
	const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<GreetCardConfig>;
	return { ...DEFAULT_GREET_CARD, ...r };
}
