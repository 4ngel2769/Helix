import { AuditLogEvent, type Guild } from 'discord.js';

/** Resolve who performed an audit-log action, ignoring stale (unrelated) entries. */
export async function auditExecutor(guild: Guild, type: AuditLogEvent): Promise<{ id: string; tag: string } | null> {
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
