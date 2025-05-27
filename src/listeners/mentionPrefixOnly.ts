import type { Events } from '@sapphire/framework';
import { Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';

export class UserEvent extends Listener<typeof Events.MentionPrefixOnly> {
    public override async run(message: Message) {
        const prefix = this.container.client.options.defaultPrefix;
        
        // Create a slash command mention for the help command
        const helpCommandId = this.container.client.application?.commands.cache.find(
            cmd => cmd.name === 'help'
        )?.id;
        
        const helpSlashMention = helpCommandId 
            ? `</${'help'}:${helpCommandId}>`
            : '/help';
        
        const content = prefix
            ? `My prefix in this guild is: \`${prefix}\`\nTo get started, use \`${prefix}help\` or ${helpSlashMention}`
            : `To get started, use ${helpSlashMention}`;
            
        return message.channel.isSendable() && message.reply({
            content,
            allowedMentions: { repliedUser: false }
        });
    }
}
