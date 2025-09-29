import type { Events } from '@sapphire/framework';
import { Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';

export class UserEvent extends Listener<typeof Events.MentionPrefixOnly> {
    public override async run(message: Message) {
        const prefix = this.container.client.options.defaultPrefix;
        
        // Create a slash command mention for the help command
        let helpSlashMention = '/help';
        
        if (this.container.client.application) {
            try {
                if (!this.container.client.application.commands.cache.size) {
                    await this.container.client.application.commands.fetch();
                }
                
                const helpCommandId = this.container.client.application.commands.cache.find(
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
