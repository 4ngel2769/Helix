import { Events, Listener } from '@sapphire/framework';
import { AuditLogEvent, type GuildBan } from 'discord.js';
import { sendLog, consumeSuppressed } from '../../../lib/logging/logService';
import { auditExecutor } from './_shared';

export class GuildBanRemoveLogListener extends Listener<typeof Events.GuildBanRemove> {
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
