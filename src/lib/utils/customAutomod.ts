import { PermissionFlagsBits, type Message } from 'discord.js';
import type { AutomodAction, AutomodFilter, CustomAutomodSettings } from '../../models/Guild';

const INVITE_RE = /discord(?:app)?\.(?:com|gg)(?:\/invite)?\/[a-z0-9-]+/i;
const LINK_RE = /https?:\/\/[^\s]+/i;
const SPOILER_RE = /\|\|[\s\S]+?\|\|/;
const ZALGO_RE = new RegExp('[\\u0300-\\u036F\\u0489]', 'g');
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
	repeatOn: boolean;
	repeatCount: number;
	repeatIntervalSeconds: number;
	spoilersOn: boolean;
	attachmentsOn: boolean;
	attachmentsMax: number;
	zalgo: boolean;
	ignoredChannels: string[];
	ignoredRoles: string[];
	action: AutomodAction;
	actions: Record<AutomodFilter, AutomodAction>;
	timeoutSeconds: number;
}

const action = (value: unknown, fallback: AutomodAction): AutomodAction =>
	value === 'delete' || value === 'delete_warn' || value === 'delete_timeout' || value === 'delete_kick' || value === 'delete_ban' ? value : fallback;

const actions = (raw: Record<string, unknown>, fallback: AutomodAction): Record<AutomodFilter, AutomodAction> => ({
	invites: action(raw.invites, fallback),
	links: action(raw.links, fallback),
	caps: action(raw.caps, fallback),
	emoji: action(raw.emoji, fallback),
	spam: action(raw.spam, fallback),
	repeat: action(raw.repeat, fallback),
	spoilers: action(raw.spoilers, fallback),
	attachments: action(raw.attachments, fallback),
	zalgo: action(raw.zalgo, fallback)
});

export function normalizeAutomod(raw: Record<string, unknown> | CustomAutomodSettings | null | undefined): NormalizedAutomod {
	const r = (raw ?? {}) as Record<string, unknown>;
	const caps = (r.caps ?? {}) as Record<string, unknown>;
	const emoji = (r.emoji ?? {}) as Record<string, unknown>;
	const spam = (r.spam ?? {}) as Record<string, unknown>;
	const repeat = (r.repeatText ?? {}) as Record<string, unknown>;
	const spoilers = (r.spoilers ?? {}) as Record<string, unknown>;
	const attachments = (r.attachments ?? {}) as Record<string, unknown>;
	const configuredActions = (r.actions ?? {}) as Record<string, unknown>;
	const globalAction = action(r.action, 'delete');
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
		repeatOn: repeat.enabled === true,
		repeatCount: clampInt(repeat.count, 2, 20, 3),
		repeatIntervalSeconds: clampInt(repeat.intervalSeconds, 2, 300, 60),
		spoilersOn: spoilers.enabled === true,
		attachmentsOn: attachments.enabled !== false,
		attachmentsMax: clampInt(attachments.max, 0, 10, 5),
		zalgo: r.zalgo === true,
		ignoredChannels: stringArray(r.ignoredChannels),
		ignoredRoles: stringArray(r.ignoredRoles),
		action: globalAction,
		actions: actions(configuredActions, globalAction),
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

function filterForReason(reason: string): AutomodFilter {
	if (reason === 'discord invite') return 'invites';
	if (reason === 'link') return 'links';
	if (reason === 'excessive caps') return 'caps';
	if (reason === 'emoji spam') return 'emoji';
	if (reason === 'spam') return 'spam';
	if (reason === 'repeat text') return 'repeat';
	if (reason === 'spoiler') return 'spoilers';
	if (reason === 'attachment limit') return 'attachments';
	return 'zalgo';
}

export function findContentViolation(text: string, s: NormalizedAutomod): string | null {
	if (!text) return null;
	if (s.blockInvites && INVITE_RE.test(text)) return 'discord invite';
	if (s.blockLinks && LINK_RE.test(text)) return 'link';
	if (s.spoilersOn && SPOILER_RE.test(text)) return 'spoiler';
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

const spamHits = new Map<string, number[]>();
const repeatHits = new Map<string, Array<{ text: string; at: number }>>();

export function checkSpam(guildId: string, userId: string, s: NormalizedAutomod, channelId = 'global'): boolean {
	const key = `${guildId}:${userId}:${channelId}`;
	const now = Date.now();
	const windowStart = now - s.spamIntervalSeconds * 1000;
	const hits = (spamHits.get(key) ?? []).filter((time) => time >= windowStart);
	hits.push(now);
	if (spamHits.size > 20_000) spamHits.clear();
	spamHits.set(key, hits);
	return hits.length >= s.spamCount;
}

export function checkRepeatText(guildId: string, userId: string, text: string, s: NormalizedAutomod, channelId = 'global'): boolean {
	const key = `${guildId}:${userId}:${channelId}`;
	const now = Date.now();
	const windowStart = now - s.repeatIntervalSeconds * 1000;
	const normalized = text.trim().toLowerCase();
	const hits = (repeatHits.get(key) ?? []).filter((hit) => hit.at >= windowStart && hit.text === normalized);
	hits.push({ text: normalized, at: now });
	if (repeatHits.size > 20_000) repeatHits.clear();
	repeatHits.set(key, hits);
	return hits.length >= s.repeatCount;
}

export async function handleCustomAutomod(message: Message, raw: Record<string, unknown> | undefined, roles: { adminRoleId?: string; modRoleId?: string } = {}): Promise<boolean> {
	const s = normalizeAutomod(raw);
	if (!s.enabled || !message.guild || !message.member) return false;
	if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;
	if (s.ignoredChannels.includes(message.channelId)) return false;
	if (s.ignoredRoles.length > 0 && message.member.roles.cache.some((role) => s.ignoredRoles.includes(role.id))) return false;

	if (roles.adminRoleId && message.member.roles.cache.has(roles.adminRoleId)) return false;
	if (roles.modRoleId && message.member.roles.cache.has(roles.modRoleId)) return false;

	let reason = findContentViolation(message.content ?? '', s);
	if (!reason && s.spoilersOn && message.attachments.some((attachment) => attachment.spoiler)) reason = 'spoiler';
	if (!reason && s.attachmentsOn && message.attachments.size > s.attachmentsMax) reason = 'attachment limit';
	if (!reason && s.spamOn && checkSpam(message.guild.id, message.author.id, s, message.channelId)) reason = 'spam';
	if (!reason && s.repeatOn && checkRepeatText(message.guild.id, message.author.id, message.content, s, message.channelId)) reason = 'repeat text';
	if (!reason) return false;

	const filter = filterForReason(reason);
	const selectedAction = s.actions[filter];
	await message.delete().catch(() => null);
	if (selectedAction !== 'delete') {
		const { ModerationService: Service } = await import('../services/ModerationService.js');
		await Service.createWarning({
			guildId: message.guild.id,
			userId: message.author.id,
			reason: `AutoMod: ${reason}`,
			moderatorId: message.client.user?.id ?? 'automod',
			moderatorTag: 'AutoMod',
			source: 'automod',
			rule: reason,
			channelId: message.channelId,
			message: message.content
		}).catch(() => null);
	}
	if (selectedAction === 'delete_timeout' || selectedAction === 'delete_kick' || selectedAction === 'delete_ban') {
		const action = selectedAction === 'delete_timeout' ? 'timeout' : selectedAction === 'delete_kick' ? 'kick' : 'ban';
		const { ModerationService: Service } = await import('../services/ModerationService.js');
		await Service.applyAction(message.guild.id, message.author.id, action, `Helix AutoMod: ${reason}`, s.timeoutSeconds).catch(() => false);
	}
	const { sendLog } = await import('../logging/logService.js');
	await sendLog(message.guild, 'automod.action', {
		description: `Helix filter (${reason}) removed a message by <@${message.author.id}> in <#${message.channelId}>.`,
		fields: message.content ? [{ name: 'Content', value: message.content.slice(0, 500) }] : [],
		targetId: message.author.id,
		contextChannelId: message.channelId,
		isBot: message.author.bot
	}).catch(() => null);
	return true;
}

export function __automodSelfCheck(): void {
	const s = normalizeAutomod({ enabled: true, blockInvites: true, blockLinks: true, caps: { enabled: true }, emoji: { enabled: true }, spam: { enabled: true }, spoilers: { enabled: true }, zalgo: true });
	const mustFlag: Array<[string, string]> = [
		['join discord.gg/abc123 now', 'invite'],
		['see https://example.com/x', 'link'],
		['THIS IS ALL CAPS SHOUTING LOUDLY', 'caps'],
		['😀😃😄😁😆😅🤣😂🙂🙃😉 extra', 'emoji'],
		['n̷o̷r̷m̷a̷l̷ ̷t̷e̷x̷t̷ ̷h̷e̷r̷e̷', 'zalgo'],
		['||spoiler||', 'spoiler']
	];
	for (const [text, which] of mustFlag) {
		if (!findContentViolation(text, s)) throw new Error(`missed ${which}: ${text}`);
	}
	for (const text of ['hello world', 'Short', 'no links here']) {
		if (findContentViolation(text, s)) throw new Error(`false positive: ${text}`);
	}
	const actionCfg = normalizeAutomod({ action: 'delete', actions: { invites: 'delete_ban', links: 'delete_kick' } });
	if (actionCfg.actions.invites !== 'delete_ban' || actionCfg.actions.links !== 'delete_kick' || actionCfg.actions.caps !== 'delete') throw new Error('automod action normalization failed');
	const spamCfg = normalizeAutomod({ enabled: true, spam: { enabled: true, count: 5, intervalSeconds: 60 } });
	for (let i = 0; i < 4; i++) {
		if (checkSpam('selfcheck-guild', 'selfcheck-user', spamCfg)) throw new Error('spam tripped early');
	}
	if (!checkSpam('selfcheck-guild', 'selfcheck-user', spamCfg)) throw new Error('spam did not trip');
	const repeatCfg = normalizeAutomod({ enabled: true, repeatText: { enabled: true, count: 3, intervalSeconds: 60 } });
	if (checkRepeatText('selfcheck-repeat', 'selfcheck-user', 'same', repeatCfg)) throw new Error('repeat tripped early');
	if (checkRepeatText('selfcheck-repeat', 'selfcheck-user', 'same', repeatCfg)) throw new Error('repeat tripped early');
	if (!checkRepeatText('selfcheck-repeat', 'selfcheck-user', 'same', repeatCfg)) throw new Error('repeat did not trip');
}
