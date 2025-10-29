import type { Events } from '@sapphire/framework';
import { Listener, container } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { Guild } from '../models/Guild';
import config from '../config';

export class UserEvent extends Listener<typeof Events.MentionPrefixOnly> {
    public override async run(message: Message) {
        // Get the prefix for this guild
        let prefix = config.bot.defaultPrefix;
        
        if (message.guild) {
            try {
                const guildData = await Guild.findOne({ guildId: message.guild.id });
                prefix = guildData?.prefix || config.bot.defaultPrefix;
            } catch (error) {
                console.error('Error fetching prefix:', error);
            }
        }
        
        // Create a slash command mention for the help command
        let helpSlashMention = '/help';
        
        if (container.client.application) {
            try {
                if (!container.client.application.commands.cache.size) {
                    await container.client.application.commands.fetch();
                }
                
                const helpCommandId = container.client.application.commands.cache.find(
                    cmd => cmd.name === 'help'
                )?.id;
                
                if (helpCommandId) {
                    helpSlashMention = `</${'help'}:${helpCommandId}>`;
                }
            } catch (error) {
                // Silently handle errors and use fallback
            }
        }
        
        const responseContent = prefix
            ? `My prefix in this guild is: \`${prefix}\`\nTo get started, use \`${prefix}help\` or ${helpSlashMention}`
            : `To get started, use ${helpSlashMention}`;
                
        if (message.channel.isSendable()) {
            return message.reply({
                content: responseContent,
                allowedMentions: { repliedUser: false }
            });
        }
        return;
    }
}
