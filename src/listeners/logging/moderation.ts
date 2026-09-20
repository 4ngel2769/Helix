import { Events, Listener } from '@sapphire/framework';
import { AuditLogEvent, type Guild, type GuildBan } from 'discord.js';
import { sendLog, consumeSuppressed } from '../../lib/logging/logService';

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
		if (consumeSuppressed(ban.guild.id, 'mod.ban', ban.user.id)) return; // already logged by /ban
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
