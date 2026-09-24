import { Events, Listener, container } from '@sapphire/framework';
import type { GuildMember } from 'discord.js';
import { Guild } from '../../models/Guild';
import { sendLog } from '../../lib/logging/logService';
import { withCardDefaults } from '../../lib/cards/cardBackgrounds';
import { renderGreetCard } from '../../lib/cards/greetCard';
import { getGuildPrefixFromCache, setGuildPrefixInCache } from '../../lib/utils/prefixCache';
import { DEFAULT_WELCOME_MESSAGE, renderMessageTemplate } from '../../lib/utils/messagePlaceholders';

export class GuildMemberAddListener extends Listener<typeof Events.GuildMemberAdd> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildMemberAdd });
	}

	public override async run(member: GuildMember) {
		void sendLog(member.guild, 'member.join', {
			description: `<@${member.id}> **${member.displayName}** joined. Member #${member.guild.memberCount}.`,
			targetId: member.id,
			isBot: member.user.bot
		});
		try {
			const guildData = await Guild.findOne({ guildId: member.guild.id }).lean();
			const configuredDefault = this.container.client.options.defaultPrefix;
			const defaultPrefix: string = (Array.isArray(configuredDefault) ? configuredDefault[0] : configuredDefault) ?? 'x';
			const resolvedPrefix = getGuildPrefixFromCache(member.guild.id) ?? guildData?.prefix ?? defaultPrefix;
			setGuildPrefixInCache(member.guild.id, resolvedPrefix);

			const templateContext = {
				userMention: `<@${member.id}>`,
				userName: member.displayName,
				userTag: member.user.username,
				prefix: resolvedPrefix,
				serverName: member.guild.name,
				serverMembers: member.guild.memberCount
			};

			if (guildData?.joinDmMessage) {
				const directMessage = renderMessageTemplate(guildData.joinDmMessage, templateContext);
				await member.user.send(directMessage).catch((error) => {
					container.logger.warn(`[welcome-dm] failed for ${member.id} in ${member.guild.id}:`, error);
				});
			}

			const channelId = guildData?.welcomeChannelId;
			if (!channelId) return;

			const channel = await member.guild.channels.fetch(channelId).catch(() => null);
			if (!channel || !channel.isTextBased()) return;

			const text = renderMessageTemplate(guildData?.welcomeMessage || DEFAULT_WELCOME_MESSAGE, templateContext);
			const card = withCardDefaults((guildData as unknown as Record<string, unknown>)?.welcomeCard);
			if (!card.enabled) {
				await (channel as unknown as { send: (content: string) => Promise<unknown> }).send(text);
				return;
			}

			try {
				const buffer = await renderGreetCard(card, {
					displayName: member.displayName,
					avatarUrl: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
					memberCount: member.guild.memberCount,
					serverName: member.guild.name,
					prefix: resolvedPrefix,
					userTag: member.user.username
				});
				await (channel as unknown as { send: (msg: unknown) => Promise<unknown> }).send({
					content: text,
					files: [{ attachment: buffer, name: 'welcome.png' }]
				});
			} catch (cardError) {
				container.logger.warn(`[welcome-card] failed for ${member.id} in ${member.guild.id}:`, cardError);
				await (channel as unknown as { send: (content: string) => Promise<unknown> }).send(text);
			}
		} catch (error) {
			container.logger.warn(`[welcome] failed to greet ${member.id} in ${member.guild.id}:`, error);
		}
	}
}
