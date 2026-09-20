import { Events, Listener, container } from '@sapphire/framework';
import type { GuildMember, PartialGuildMember } from 'discord.js';
import { Guild } from '../../models/Guild';
import { consumeSuppressed, sendLog } from '../../lib/logging/logService';
import { withCardDefaults } from '../../lib/cards/cardBackgrounds';
import { renderGreetCard } from '../../lib/cards/greetCard';
import { getGuildPrefixFromCache, setGuildPrefixInCache } from '../../lib/utils/prefixCache';
import { DEFAULT_FAREWELL_MESSAGE, renderMessageTemplate } from '../../lib/utils/messagePlaceholders';

export class GuildMemberRemoveListener extends Listener<typeof Events.GuildMemberRemove> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildMemberRemove });
	}

	public override async run(member: GuildMember | PartialGuildMember) {
		if (!consumeSuppressed(member.guild.id, 'member.leave', member.id)) {
			void sendLog(member.guild, 'member.leave', {
				description: `<@${member.id}> **${'displayName' in member && typeof (member as GuildMember).displayName === 'string' ? (member as GuildMember).displayName : (member.user?.username ?? 'Someone')}** left.`,
				targetId: member.id,
				isBot: member.user?.bot ?? false
			});
		}
		try {
			const guildData = await Guild.findOne({ guildId: member.guild.id }).lean();
			const channelId = guildData?.farewellChannelId;
			if (!channelId) return;

			const channel = await member.guild.channels.fetch(channelId).catch(() => null);
			if (!channel || !channel.isTextBased()) return;

			const configuredDefault = this.container.client.options.defaultPrefix;
			const defaultPrefix: string =
				(Array.isArray(configuredDefault) ? configuredDefault[0] : configuredDefault) ?? 'x';
			const resolvedPrefix = getGuildPrefixFromCache(member.guild.id) ?? guildData?.prefix ?? defaultPrefix;
			setGuildPrefixInCache(member.guild.id, resolvedPrefix);

			const displayName =
				'displayName' in member && typeof (member as GuildMember).displayName === 'string'
					? (member as GuildMember).displayName
					: (member.user?.username ?? 'Someone');
			const template = guildData?.farewellMessage || DEFAULT_FAREWELL_MESSAGE;
			const text = renderMessageTemplate(template, {
				userMention: `<@${member.id}>`,
				userName: displayName,
				userTag: member.user?.username ?? displayName,
				prefix: resolvedPrefix,
				serverName: member.guild.name,
				serverMembers: member.guild.memberCount
			});

		const card = withCardDefaults((guildData as unknown as Record<string, unknown>)?.farewellCard);
		if (!card.enabled) {
			await (channel as unknown as { send: (content: string) => Promise<unknown> }).send(text);
			return;
		}

		try {
			const buffer = await renderGreetCard(card, {
				displayName,
				avatarUrl: member.user?.displayAvatarURL({ extension: 'png', size: 256 }) ?? '',
				memberCount: member.guild.memberCount,
				serverName: member.guild.name,
				prefix: resolvedPrefix,
				userTag: member.user?.username ?? displayName
			});
			await (channel as unknown as { send: (msg: unknown) => Promise<unknown> }).send({
				content: text,
				files: [{ attachment: buffer, name: 'farewell.png' }]
			});
		} catch (cardError) {
			container.logger.warn(`[farewell-card] failed for ${member.id} in ${member.guild.id}:`, cardError);
			await (channel as unknown as { send: (content: string) => Promise<unknown> }).send(text);
		}
		} catch (error) {
			container.logger.warn(`[farewell] failed to say goodbye to ${member.id} in ${member.guild.id}:`, error);
		}
	}
}
