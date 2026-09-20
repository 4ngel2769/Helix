/**
 * Job market catalogue + tuning knobs.
 *
 * Applications are accepted with an RNG roll that improves with the player's
 * economy level. Working a shift pays coins + XP and keeps the job streak
 * alive; skipping days builds strikes that demote, then finally fire you.
 * Fired players must wait out a cooldown before applying anywhere again.
 */

/** One job in the market. `level` is the job grade (0 = entry). */
export interface JobDefinition {
	id: string;
	title: string;
	emoji: string;
	description: string;
	/** Lowest economy level that can apply. */
	requiredLevel: number;
	/** Base chance (0-1) of an application being accepted. */
	acceptChance: number;
	/** Extra accept chance per economy level above the requirement. */
	acceptPerLevel: number;
	/** Coin range paid per shift, before level/promo multipliers. */
	payMin: number;
	payMax: number;
	/** Job XP earned per completed shift. */
	xpPerShift: number;
	/** Cooldown between shifts, in hours. */
	shiftHours: number;
	grade: number;
}

export interface PromotionTier {
	grade: number;
	title: string;
	/** Job XP needed to reach this grade. */
	xp: number;
	/** Multiplier applied to the shift pay. */
	payMultiplier: number;
}

/** Job XP needed per grade. `PROMOTION_TIERS[i].xp` is the XP to *reach* grade i. */
export const PROMOTION_TIERS: PromotionTier[] = [
	{ grade: 0, title: 'Intern', xp: 0, payMultiplier: 1.0 },
	{ grade: 1, title: 'Junior', xp: 5, payMultiplier: 1.25 },
	{ grade: 2, title: 'Associate', xp: 15, payMultiplier: 1.6 },
	{ grade: 3, title: 'Senior', xp: 30, payMultiplier: 2.1 },
	{ grade: 4, title: 'Lead', xp: 50, payMultiplier: 2.8 },
	{ grade: 5, title: 'Director', xp: 80, payMultiplier: 3.8 }
];

export const JOB_STRIKES_TO_DEMOTE = 2;
export const JOB_STRIKES_TO_FIRE = 3;
/** Hours after getting fired before applications are accepted again. */
export const JOB_REAPPLY_COOLDOWN_HOURS = 12;
/** Extra hours beyond a shift's cooldown before a streak starts decaying. */
export const JOB_STREAK_GRACE_HOURS = 24;

export const JOBS: JobDefinition[] = [
	{
		id: 'courier',
		title: 'Courier',
		emoji: '📦',
		description: 'Deliver parcels across town. Easy work, easy pay.',
		requiredLevel: 1,
		acceptChance: 0.95,
		acceptPerLevel: 0.01,
		payMin: 60,
		payMax: 140,
		xpPerShift: 2,
		shiftHours: 4,
		grade: 0
	},
	{
		id: 'barista',
		title: 'Barista',
		emoji: '☕',
		description: 'Espresso, foam art and morning rushes.',
		requiredLevel: 1,
		acceptChance: 0.9,
		acceptPerLevel: 0.01,
		payMin: 70,
		payMax: 160,
		xpPerShift: 2,
		shiftHours: 4,
		grade: 0
	},
	{
		id: 'mechanic',
		title: 'Mechanic',
		emoji: '🔧',
		description: 'Fix engines, grease everything, earn steady coin.',
		requiredLevel: 2,
		acceptChance: 0.8,
		acceptPerLevel: 0.02,
		payMin: 120,
		payMax: 260,
		xpPerShift: 3,
		shiftHours: 6,
		grade: 0
	},
	{
		id: 'developer',
		title: 'App Developer',
		emoji: '💻',
		description: 'Ship code, squash bugs, collect a salary.',
		requiredLevel: 3,
		acceptChance: 0.65,
		acceptPerLevel: 0.03,
		payMin: 200,
		payMax: 420,
		xpPerShift: 4,
		shiftHours: 6,
		grade: 0
	},
	{
		id: 'chef',
		title: 'Chef',
		emoji: '👨‍🍳',
		description: 'Run a kitchen and plate up five-star dishes.',
		requiredLevel: 4,
		acceptChance: 0.55,
		acceptPerLevel: 0.03,
		payMin: 260,
		payMax: 540,
		xpPerShift: 5,
		shiftHours: 8,
		grade: 0
	},
	{
		id: 'pilot',
		title: 'Pilot',
		emoji: '✈️',
		description: 'Fly the skies. Prestigious, picky, pays very well.',
		requiredLevel: 6,
		acceptChance: 0.4,
		acceptPerLevel: 0.04,
		payMin: 400,
		payMax: 900,
		xpPerShift: 6,
		shiftHours: 8,
		grade: 0
	}
];

export function findJob(id: string): JobDefinition | null {
	const needle = id.toLowerCase().replace(/[^a-z]/g, '');
	return JOBS.find((job) => job.id === needle || job.title.toLowerCase().replace(/[^a-z]/g, '') === needle) ?? null;
}

/** Acceptance roll for an application (0-1 RNG vs chance). */
export function rollApplication(job: JobDefinition, economyLevel: number): boolean {
	const chance = Math.min(0.98, job.acceptChance + Math.max(0, economyLevel - job.requiredLevel) * job.acceptPerLevel);
	return Math.random() < chance;
}

/** Current accept chance (displayed so the RNG feels fair). */
export function acceptChanceFor(job: JobDefinition, economyLevel: number): number {
	return Math.min(0.98, job.acceptChance + Math.max(0, economyLevel - job.requiredLevel) * job.acceptPerLevel);
}

/** Promotion tier reached for the given job XP. */
export function tierForXp(xp: number): PromotionTier {
	let current = PROMOTION_TIERS[0];
	for (const tier of PROMOTION_TIERS) {
		if (xp >= tier.xp) current = tier;
		else break;
	}
	return current;
}

/** Random pay within the job band, scaled by tier + economy level. */
export function rollShiftPay(job: JobDefinition, grade: number, economyLevel: number): number {
	const tier = PROMOTION_TIERS[grade] ?? PROMOTION_TIERS[0];
	const base = job.payMin + Math.random() * (job.payMax - job.payMin);
	return Math.floor(base * tier.payMultiplier * (1 + economyLevel * 0.02));
}
