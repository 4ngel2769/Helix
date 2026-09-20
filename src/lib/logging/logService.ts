import { container } from '@sapphire/framework';
import { EmbedBuilder, type Guild, type Snowflake } from 'discord.js';
import { Guild as GuildModel, type IGuild } from '../../models/Guild';
import { getGroupColor, getLogEventDef } from './logEvents';

export interface LogPayload {
	description: string;
	title?: string;
	fields?: Array<{ name: string; value: string; inline?: boolean }>;
	/** User whose action triggered the log (ignore-list + mention rendering). */
	actorId?: Snowflake | string;
	/** Subject of the log (ignore-list + mention rendering). */
	targetId?: Snowflake | string;
	/** IDs of roles held by the actor/target, for role ignores. */
	roleIds?: string[];
	/** Channel where the logged event happened (for channel ignores + context). */
	contextChannelId?: string;
	/** True when the subject is a bot (skipped unless logIncludeBots). */
	isBot?: boolean;
	color?: string;
}

type GuildData = IGuild & Record<string, any>;

async function loadGuildData(guildId: string): Promise<GuildData | null> {
	const doc = await GuildModel.findOne({ guildId }).lean();
	return doc as GuildData | null;
}

export function isEventEnabled(data: GuildData | null | undefined, eventKey: string): boolean {
	const def = getLogEventDef(eventKey);
	if (!def) return false;
	const overrides = (data?.logEvents ?? {}) as Record<string, boolean>;
	return overrides[eventKey] ?? def.defaultEnabled;
}

export function resolveLogChannelId(data: GuildData | null | undefined, eventKey: string): string | null {
	const channels = (data?.logEventChannels ?? {}) as Record<string, string>;
	const override = channels[eventKey];
	if (typeof override === 'string' && override.length > 0) return override;
	const def = getLogEventDef(eventKey);
	const legacy = def?.legacyChannel ? (data?.[def.legacyChannel] as string | null | undefined) : null;
	if (typeof legacy === 'string' && legacy.length > 0) return legacy;
	const fallback = data?.logChannelId as string | null | undefined;
	return typeof fallback === 'string' && fallback.length > 0 ? fallback : null;
}

export function isIgnored(
	data: GuildData | null | undefined,
	opts: { userId?: string; roleIds?: string[]; channelId?: string; isBot?: boolean }
): boolean {
	if (!data) return false;
	if (opts.isBot && !data.logIncludeBots) return true;
	const users = (data.logIgnoredUsers ?? []) as string[];
	const roles = (data.logIgnoredRoles ?? []) as string[];
	const channels = (data.logIgnoredChannels ?? []) as string[];
	if (opts.userId && users.includes(opts.userId)) return true;
	if (opts.channelId && channels.includes(opts.channelId)) return true;
	if (opts.roleIds?.some((r) => roles.includes(r))) return true;
	return false;
}

function mention(id: string | undefined, kind: 'user' | 'channel' | 'role'): string {
	if (!id) return '*unknown*';
	if (kind === 'user') return `<@${id}>`;
	if (kind === 'channel') return `<#${id}>`;
	return `<@&${id}>`;
}

/**
 * Build + route a log embed. Returns false when skipped (disabled, ignored, no channel).
 * Never throws — callers (listeners/commands) must not crash on logging failures.
 */
export async function sendLog(guild: Guild, eventKey: string, payload: LogPayload): Promise<boolean> {
	try {
		const data = await loadGuildData(guild.id);
		if (!data) return false;
		if (!isEventEnabled(data, eventKey)) return false;
		if (
			isIgnored(data, {
				userId: payload.actorId ?? payload.targetId,
				roleIds: payload.roleIds,
				channelId: payload.contextChannelId,
				isBot: payload.isBot
			})
		) {
			return false;
		}
		const channelId = resolveLogChannelId(data, eventKey);
		if (!channelId) return false;
		if ((data.logIgnoredChannels ?? []).includes(channelId)) return false;

		const channel = await guild.channels.fetch(channelId).catch(() => null);
		if (!channel || !channel.isTextBased()) return false;

		const def = getLogEventDef(eventKey);
		const embed = new EmbedBuilder()
			.setColor((payload.color ?? getGroupColor(eventKey)) as `#${string}`)
			.setTitle(payload.title ?? def?.label ?? eventKey)
			.setDescription(payload.description.slice(0, 4000))
			.setTimestamp();
		if (payload.fields?.length) {
			embed.addFields(payload.fields.slice(0, 25).map((f) => ({ name: f.name.slice(0, 256), value: f.value.slice(0, 1024), inline: f.inline ?? false })));
		}
		const footer: string[] = [];
		if (payload.actorId) footer.push(`By ${payload.actorId}`);
		if (payload.targetId && payload.targetId !== payload.actorId) footer.push(`Target ${payload.targetId}`);
		if (footer.length > 0) embed.setFooter({ text: footer.join(' · ').slice(0, 2048) });

		await (channel as unknown as { send: (msg: unknown) => Promise<unknown> }).send({ embeds: [embed] });
		return true;
	} catch (error) {
		container.logger.warn(`[logs] sendLog ${eventKey} failed in ${guild.id}:`, error);
		return false;
	}
}

export const LogFormat = { mention };

// --- Command/event dedupe -------------------------------------------------
// Commands log rich entries (actor + reason) themselves, then suppress the
// matching event echo (ban/timeout/kick also fire Discord events).
const suppressions = new Map<string, number>();

export function suppressNext(guildId: string, eventKey: string, targetId: string, ms = 20_000): void {
	suppressions.set(`${guildId}:${eventKey}:${targetId}`, Date.now() + ms);
}

export function consumeSuppressed(guildId: string, eventKey: string, targetId: string): boolean {
	const key = `${guildId}:${eventKey}:${targetId}`;
	const expiry = suppressions.get(key);
	if (expiry === undefined) return false;
	suppressions.delete(key);
	return expiry > Date.now();
}
