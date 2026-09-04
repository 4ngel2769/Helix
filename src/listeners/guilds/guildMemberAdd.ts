import { Events, Listener, container } from '@sapphire/framework';
import type { GuildMember } from 'discord.js';
import { Guild } from '../../models/Guild';
import { getGuildPrefixFromCache, setGuildPrefixInCache } from '../../lib/utils/prefixCache';
import { DEFAULT_WELCOME_MESSAGE, renderMessageTemplate } from '../../lib/utils/messagePlaceholders';

export class GuildMemberAddListener extends Listener<typeof Events.GuildMemberAdd> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildMemberAdd });
	}

	public override async run(member: GuildMember) {
		try {
			const guildData = await Guild.findOne({ guildId: member.guild.id }).lean();
			const channelId = guildData?.welcomeChannelId;
			if (!channelId) return;

			const channel = await member.guild.channels.fetch(channelId).catch(() => null);
			if (!channel || !channel.isTextBased()) return;

			const configuredDefault = this.container.client.options.defaultPrefix;
			const defaultPrefix: string =
				(Array.isArray(configuredDefault) ? configuredDefault[0] : configuredDefault) ?? 'x';
			const resolvedPrefix = getGuildPrefixFromCache(member.guild.id) ?? guildData?.prefix ?? defaultPrefix;
			setGuildPrefixInCache(member.guild.id, resolvedPrefix);

			const template = guildData?.welcomeMessage || DEFAULT_WELCOME_MESSAGE;
			const text = renderMessageTemplate(template, {
				userMention: `<@${member.id}>`,
				userName: member.displayName,
				userTag: member.user.username,
				prefix: resolvedPrefix,
				serverName: member.guild.name,
				serverMembers: member.guild.memberCount
			});

			await (channel as unknown as { send: (content: string) => Promise<unknown> }).send(text);
		} catch (error) {
			container.logger.warn(`[welcome] failed to greet ${member.id} in ${member.guild.id}:`, error);
		}
	}
}
