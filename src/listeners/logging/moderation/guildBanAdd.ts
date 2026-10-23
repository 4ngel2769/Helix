import { Events, Listener } from '@sapphire/framework';
import { AuditLogEvent, type GuildBan } from 'discord.js';
import { sendLog, consumeSuppressed } from '../../../lib/logging/logService';
import { Guild as GuildModel } from '../../../models/Guild';
import { renderMessageTemplate } from '../../../lib/utils/messagePlaceholders';
import { auditExecutor } from './_shared';

export class GuildBanAddLogListener extends Listener<typeof Events.GuildBanAdd> {
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
