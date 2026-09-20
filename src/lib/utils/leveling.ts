/**
 * XP curve + awarding. The mongoose model is imported lazily so the pure
 * math (and __levelSelfCheck) stays runnable under plain `bun -e`.
 */
/** Total XP needed to REACH `level` (level 1 = 0). Step n→n+1 costs 100*n. */
export function totalXpForLevel(level: number): number {
	const l = Math.max(1, Math.floor(level));
	return 50 * (l - 1) * l;
}

export function levelForXp(xp: number): number {
	const x = Math.max(0, Math.floor(xp));
	return Math.floor((1 + Math.sqrt(1 + (8 * x) / 100)) / 2);
}

export function progressToNext(xp: number): { level: number; into: number; needed: number } {
	const level = levelForXp(xp);
	const base = totalXpForLevel(level);
	const needed = 100 * level;
	return { level, into: xp - base, needed };
}

export function progressBar(into: number, needed: number, width = 10): string {
	const filled = Math.max(0, Math.min(width, Math.round((into / Math.max(1, needed)) * width)));
	return '▰'.repeat(filled) + '▱'.repeat(width - filled);
}

// In-memory award cooldowns so chatty guilds don't hammer Mongo:
// one Map check per message, one atomic upsert per award.
const cooldowns = new Map<string, number>();
const MAX_COOLDOWN_KEYS = 50_000;

export interface AwardResult {
	xp: number;
	level: number;
	leveledUp: boolean;
	gained: number;
}

/** Returns null when on cooldown (no DB touched). */
export async function awardXp(
	guildId: string,
	userId: string,
	xpMin: number,
	xpMax: number,
	cooldownSeconds: number
): Promise<AwardResult | null> {
	const key = `${guildId}:${userId}`;
	const now = Date.now();
	const nextAllowed = cooldowns.get(key) ?? 0;
	if (now < nextAllowed) return null;
	cooldowns.set(key, now + Math.max(0, cooldownSeconds) * 1000);
	if (cooldowns.size > MAX_COOLDOWN_KEYS) cooldowns.clear();

	const gained = xpMin >= xpMax ? Math.max(0, Math.floor(xpMin)) : Math.floor(xpMin + Math.random() * (xpMax - xpMin + 1));
	if (gained <= 0) return null;
	const { GuildXp } = await import('../../models/GuildXp.js');
	const doc = await GuildXp.findOneAndUpdate(
		{ guildId, userId },
		{ $inc: { xp: gained }, $set: { lastAwardAt: new Date() } },
		{ upsert: true, returnDocument: 'after' }
	).lean();
	const xp = doc?.xp ?? gained;
	return { xp, level: levelForXp(xp), leveledUp: levelForXp(xp - gained) < levelForXp(xp), gained };
}

export function renderLevelUpMessage(template: string, username: string, mention: string, level: number, xp: number): string {
	return template
		.replaceAll('{user}', mention)
		.replaceAll('{username}', username)
		.replaceAll('{level}', String(level))
		.replaceAll('{xp}', String(xp))
		.slice(0, 2000);
}

// Runnable self-check: bun -e "import { __levelSelfCheck } from './src/lib/utils/leveling.ts'; __levelSelfCheck(); console.log('curve ok')"
export function __levelSelfCheck(): void {
	const cases: Array<[number, number]> = [
		[0, 1],
		[99, 1],
		[100, 2],
		[299, 2],
		[300, 3],
		[1000, 5]
	];
	for (const [xp, level] of cases) {
		if (levelForXp(xp) !== level) throw new Error(`levelForXp(${xp}) != ${level}`);
		if (totalXpForLevel(level) > xp) throw new Error(`totalXpForLevel(${level}) > ${xp}`);
	}
}
