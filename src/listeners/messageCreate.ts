import { Events, Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';

export class UserEvent extends Listener<typeof Events.MessageCreate> {
    public constructor(context: Listener.Context, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.MessageCreate
        });
    }

    public override async run(message: Message) {
        // Ignore messages from bots
        if (message.author.bot) return;
        
        // Get the bot's user ID
        const botId = this.container.client.user!.id;
        
        // Get cleaned message content without extra bits
        const cleanContent = message.content.trim();
        
        const isMentionOnly = 
            cleanContent === `<@${botId}>` || 
            cleanContent === `<@!${botId}>`;
        
        // Exit if not a mention-only message
        if (!isMentionOnly) return;
        
        try {
            const prefix = this.container.client.options.defaultPrefix;
            let helpSlashMention = '/help';
            
            if (this.container.client.application) {
                try {
                    // Force fetch application commands if they might not be cached
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
                    console.error('[ERROR] Failed to fetch application commands:', error);
                }
            }
            
            const responseContent = prefix
                ? `My prefix in this guild is: \`${prefix}\`\nTo get started, use \`${prefix}help\` or ${helpSlashMention}`
                : `To get started, use ${helpSlashMention}`;
                
            if (message.channel.isSendable()) {
                await message.reply({
                    content: responseContent,
                    allowedMentions: { repliedUser: false }
                });
            }
        } catch (error) {
            console.error('[ERROR] Error in messageCreate event:', error);
        }
    }
}