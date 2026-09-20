import { PermissionFlagsBits, type Message } from 'discord.js';
import type { CustomAutomodSettings } from '../../models/Guild';
// NOTE: User model + logService are imported lazily inside handleCustomAutomod
// so the pure checks (and __automodSelfCheck) stay runnable under plain `bun -e`.

const INVITE_RE = /discord(?:app)?\.(?:com|gg)(?:\/invite)?\/[a-z0-9-]+/i;
const LINK_RE = /https?:\/\/[^\s]+/i;
const ZALGO_RE = new RegExp('[\\u0300-\\u036F\\u0489]', 'g');
// ponytail: pictographs + emoticons + symbols blocks cover virtually all emoji
const EMOJI_RE = new RegExp('[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}]', 'gu');

export interface NormalizedAutomod {
	enabled: boolean;
	blockInvites: boolean;
	blockLinks: boolean;
	capsOn: boolean;
	capsMinLength: number;
	capsPercent: number;
	emojiOn: boolean;
	emojiMax: number;
	spamOn: boolean;
	spamCount: number;
	spamIntervalSeconds: number;
	zalgo: boolean;
	ignoredChannels: string[];
	ignoredRoles: string[];
	action: 'delete' | 'delete_warn' | 'delete_timeout';
	timeoutSeconds: number;
}

export function normalizeAutomod(raw: Record<string, unknown> | CustomAutomodSettings | null | undefined): NormalizedAutomod {
	const r = (raw ?? {}) as Record<string, unknown>;
	const caps = (r.caps ?? {}) as Record<string, unknown>;
	const emoji = (r.emoji ?? {}) as Record<string, unknown>;
	const spam = (r.spam ?? {}) as Record<string, unknown>;
	const action = r.action === 'delete_warn' || r.action === 'delete_timeout' ? r.action : 'delete';
	return {
		enabled: r.enabled === true,
		blockInvites: r.blockInvites === true,
		blockLinks: r.blockLinks === true,
		capsOn: caps.enabled !== false,
		capsMinLength: clampInt(caps.minLength, 5, 500, 10),
		capsPercent: clampInt(caps.percent, 10, 100, 70),
		emojiOn: emoji.enabled !== false,
		emojiMax: clampInt(emoji.max, 1, 100, 10),
		spamOn: spam.enabled !== false,
		spamCount: clampInt(spam.count, 2, 20, 5),
		spamIntervalSeconds: clampInt(spam.intervalSeconds, 2, 120, 10),
		zalgo: r.zalgo === true,
		ignoredChannels: stringArray(r.ignoredChannels),
		ignoredRoles: stringArray(r.ignoredRoles),
		action,
		timeoutSeconds: clampInt(r.timeoutSeconds, 10, 2419200, 600)
	};
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
	const n = typeof v === 'number' && Number.isInteger(v) ? v : fallback;
	return Math.max(min, Math.min(max, n));
}

function stringArray(v: unknown): string[] {
	return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Pure content check — no Discord calls, unit-testable. Returns a short reason or null. */
export function findContentViolation(text: string, s: NormalizedAutomod): string | null {
	if (!text) return null;
	if (s.blockInvites && INVITE_RE.test(text)) return 'discord invite';
	if (s.blockLinks && LINK_RE.test(text)) return 'link';
	const letters = text.replace(/[^a-zA-Z]/g, '');
	if (s.capsOn && letters.length >= s.capsMinLength) {
		const upper = text.replace(/[^A-Z]/g, '').length;
		if ((upper / letters.length) * 100 >= s.capsPercent) return 'excessive caps';
	}
	const emojiCount = text.match(EMOJI_RE)?.length ?? 0;
	if (s.emojiOn && emojiCount > s.emojiMax) return 'emoji spam';
	const zalgoCount = text.match(ZALGO_RE)?.length ?? 0;
	if (s.zalgo && zalgoCount >= 5) return 'zalgo text';
	return null;
}

// Sliding-window spam tracker: timestamps per guild+user, pruned on each hit.
const spamHits = new Map<string, number[]>();

export function checkSpam(guildId: string, userId: string, s: NormalizedAutomod): boolean {
	const key = `${guildId}:${userId}`;
	const now = Date.now();
	const windowStart = now - s.spamIntervalSeconds * 1000;
	const hits = (spamHits.get(key) ?? []).filter((t) => t >= windowStart);
	hits.push(now);
	if (spamHits.size > 20_000) spamHits.clear();
	spamHits.set(key, hits);
	return hits.length >= s.spamCount;
}

/**
 * Enforce Helix custom filters on a message. Returns true when the message
 * was handled (caller should skip XP and further processing).
 * Everything is best-effort — failures never throw.
 */
export async function handleCustomAutomod(message: Message, raw: Record<string, unknown> | undefined): Promise<boolean> {
	const s = normalizeAutomod(raw);
	if (!s.enabled || !message.guild || !message.member) return false;
	// Staff with moderation rights and explicitly ignored channels/roles are exempt.
	if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;
	if (s.ignoredChannels.includes(message.channelId)) return false;
	if (s.ignoredRoles.length > 0 && message.member.roles.cache.some((r) => s.ignoredRoles.includes(r.id))) return false;

	let reason = findContentViolation(message.content ?? '', s);
	if (!reason && s.spamOn && checkSpam(message.guild.id, message.author.id, s)) reason = 'spam';
	if (!reason) return false;

	await message.delete().catch(() => null);
	const { sendLog } = await import('../logging/logService.js');

	if (s.action === 'delete_warn' || s.action === 'delete_timeout') {
		const { User } = await import('../../models/User.js');
		await User.updateOne(
			{ userId: message.author.id },
			{
				$push: {
					warnings: {
						guildId: message.guild.id,
						reason: `AutoMod: ${reason}`.slice(0, 1000),
						moderatorId: message.client.user?.id ?? 'automod',
						moderatorTag: 'AutoMod',
						timestamp: new Date(),
						active: true
					}
				},
				$setOnInsert: { username: message.author.username, discriminator: '0' }
			},
			{ upsert: true }
		).catch(() => null);
	}
	if (s.action === 'delete_timeout') {
		await message.member.timeout(s.timeoutSeconds * 1000, `Helix AutoMod: ${reason}`).catch(() => null);
	}

	await sendLog(message.guild, 'automod.action', {
		description: `Helix filter (${reason}) removed a message by <@${message.author.id}> in <#${message.channelId}>.`,
		fields: message.content ? [{ name: 'Content', value: message.content.slice(0, 500) }] : [],
		targetId: message.author.id,
		contextChannelId: message.channelId,
		isBot: message.author.bot
	}).catch(() => null);
	return true;
}

// Runnable self-check: bun -e "import { __automodSelfCheck } from './src/lib/utils/customAutomod.ts'; __automodSelfCheck(); console.log('automod ok')"
export function __automodSelfCheck(): void {
	const s = normalizeAutomod({ enabled: true, blockInvites: true, blockLinks: true, caps: { enabled: true }, emoji: { enabled: true }, spam: { enabled: true }, zalgo: true });
	const mustFlag: Array<[string, string]> = [
		['join discord.gg/abc123 now', 'invite'],
		['see https://example.com/x', 'link'],
		['THIS IS ALL CAPS SHOUTING LOUDLY', 'caps'],
		['😀😃😄😁😆😅🤣😂🙂🙃😉 extra', 'emoji'],
		['n̷o̷r̷m̷a̷l̷ ̷t̷e̷x̷t̷ ̷h̷e̷r̷e̷', 'zalgo']
	];
	for (const [text, which] of mustFlag) {
		if (!findContentViolation(text, s)) throw new Error(`missed ${which}: ${text}`);
	}
	const clean = ['hello world', 'Short', 'no links here'];
	for (const text of clean) {
		if (findContentViolation(text, s)) throw new Error(`false positive: ${text}`);
	}
	// spam ring: 5 rapid messages trip the default count of 5
	const spamCfg = normalizeAutomod({ enabled: true, spam: { enabled: true, count: 5, intervalSeconds: 60 } });
	for (let i = 0; i < 4; i++) {
		if (checkSpam('selfcheck-guild', 'selfcheck-user', spamCfg)) throw new Error('spam tripped early');
	}
	if (!checkSpam('selfcheck-guild', 'selfcheck-user', spamCfg)) throw new Error('spam did not trip');
}
