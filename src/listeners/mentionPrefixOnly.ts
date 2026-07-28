import type { Events } from '@sapphire/framework';
import { Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { Guild } from '../models/Guild';
import { getGuildPrefixFromCache, setGuildPrefixInCache } from '../lib/utils/prefixCache';

const HELP_MENTION_REFRESH_MS = 5 * 60 * 1000;
let cachedHelpSlashMention = '/help';
let nextHelpMentionRefreshAt = 0;

export class UserEvent extends Listener<typeof Events.MentionPrefixOnly> {
    public override async run(message: Message) {
        const configuredDefaultPrefix = this.container.client.options.defaultPrefix;
        const defaultPrefix = (Array.isArray(configuredDefaultPrefix) ? configuredDefaultPrefix[0] : configuredDefaultPrefix) || 'x';
        let prefix = defaultPrefix;

        if (message.guildId) {
            const cached = getGuildPrefixFromCache(message.guildId);
            if (cached) {
                prefix = cached;
            } else {
                try {
                    const guildData = await Guild.findOne({ guildId: message.guildId }, { prefix: 1 }).lean();
                    prefix = guildData?.prefix || defaultPrefix;
                    setGuildPrefixInCache(message.guildId, prefix);
                } catch (error) {
                    this.container.logger.debug('Failed to resolve guild prefix for mention reply:', error);
                }
            }
        }

        const now = Date.now();

        if (this.container.client.application && now >= nextHelpMentionRefreshAt) {
            nextHelpMentionRefreshAt = now + HELP_MENTION_REFRESH_MS;
            try {
                if (!this.container.client.application.commands.cache.size) {
                    await this.container.client.application.commands.fetch();
                }
                
                const helpCommandId = this.container.client.application.commands.cache.find(
                    cmd => cmd.name === 'help'
                )?.id;
                
                if (helpCommandId) {
                    cachedHelpSlashMention = `</help:${helpCommandId}>`;
                }
            } catch (error) {
                this.container.logger.debug('Failed to refresh help slash mention:', error);
            }
        }
        
        const responseContent = prefix
            ? `My prefix in this guild is: \`${prefix}\`\nTo get started, use \`${prefix}help\` or ${cachedHelpSlashMention}`
            : `To get started, use ${cachedHelpSlashMention}`;
                
        if (message.channel.isSendable()) {
            return message.reply({
                content: responseContent,
                allowedMentions: { repliedUser: false }
            });
        }
        return;
    }
}
