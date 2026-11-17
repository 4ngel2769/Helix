import { Events, Listener } from '@sapphire/framework';
import type { Guild, GuildAuditLogsEntry } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class AuditLogEntryCreateLogListener extends Listener<typeof Events.GuildAuditLogEntryCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) { super(context, { ...options, event: Events.GuildAuditLogEntryCreate }); }
	public override async run(entry: GuildAuditLogsEntry, guild: Guild) {
		const fields = [{ name: 'Action', value: entry.action.toString(), inline: true }, ...(entry.executorId ? [{ name: 'Executor', value: `<@${entry.executorId}>`, inline: true }] : []), ...(entry.targetId ? [{ name: 'Target ID', value: entry.targetId, inline: true }] : []), ...(entry.reason ? [{ name: 'Reason', value: entry.reason.slice(0, 1024) }] : [])];
		await sendLog(guild, 'audit.entry', { description: 'A new audit log entry was received from Discord.', fields });
	}
}
