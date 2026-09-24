import { Events, Listener } from '@sapphire/framework';
import { AuditLogEvent, type Guild, type GuildBan } from 'discord.js';
import { sendLog, consumeSuppressed } from '../../lib/logging/logService';
import { Guild as GuildModel } from '../../models/Guild';
import { renderMessageTemplate } from '../../lib/utils/messagePlaceholders';

async function auditExecutor(guild: Guild, type: AuditLogEvent): Promise<{ id: string; tag: string } | null> {
	try {
		const logs = await guild.fetchAuditLogs({ type, limit: 1 });
		const entry = logs.entries.first();
		if (!entry?.executor?.tag) return null;
		// Only trust entries from the last 10s (avoid attributing stale actions).
		if (Date.now() - entry.createdTimestamp > 10_000) return null;
		return { id: entry.executor.id, tag: entry.executor.tag };
	} catch {
		return null;
	}
}

export class GuildBanAddListener extends Listener<typeof Events.GuildBanAdd> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildBanAdd });
	}

	public override async run(ban: GuildBan) {
		const suppressed = consumeSuppressed(ban.guild.id, 'mod.ban', ban.user.id);
		if (!suppressed) {
			const executor = await auditExecutor(ban.guild, AuditLogEvent.MemberBanAdd);
			const reason = ban.reason ?? 'No reason provided';
			await sendLog(ban.guild, 'mod.ban', {
				description: `**${ban.user.tag}** (<@${ban.user.id}>) was banned.${executor ? ` By ${executor.tag}.` : ''}`,
				fields: [{ name: 'Reason', value: reason.slice(0, 1024) }],
				actorId: executor?.id,
				targetId: ban.user.id,
				isBot: ban.user.bot
			});
		}

		const guildData = await GuildModel.findOne({ guildId: ban.guild.id }).lean().catch(() => null);
		if (!guildData?.banMessage || !guildData.farewellChannelId) return;
		const channel = await ban.guild.channels.fetch(guildData.farewellChannelId).catch(() => null);
		if (!channel?.isTextBased()) return;

		const configuredDefault = ban.guild.client.options.defaultPrefix;
		const defaultPrefix = (Array.isArray(configuredDefault) ? configuredDefault[0] : configuredDefault) ?? 'x';
		const message = renderMessageTemplate(guildData.banMessage, {
			userMention: `<@${ban.user.id}>`,
			userName: ban.user.username,
			userTag: ban.user.username,
			prefix: guildData.prefix ?? defaultPrefix,
			serverName: ban.guild.name,
			serverMembers: ban.guild.memberCount
		});
		await (channel as unknown as { send: (content: string) => Promise<unknown> }).send(message).catch(() => null);
	}
}

export class GuildBanRemoveListener extends Listener<typeof Events.GuildBanRemove> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildBanRemove });
	}

	public override async run(ban: GuildBan) {
		if (consumeSuppressed(ban.guild.id, 'mod.unban', ban.user.id)) return; // already logged by /unban
		const executor = await auditExecutor(ban.guild, AuditLogEvent.MemberBanRemove);
		await sendLog(ban.guild, 'mod.unban', {
			description: `**${ban.user.tag}** (<@${ban.user.id}>) was unbanned.${executor ? ` By ${executor.tag}.` : ''}`,
			actorId: executor?.id,
			targetId: ban.user.id,
			isBot: ban.user.bot
		});
	}
}
