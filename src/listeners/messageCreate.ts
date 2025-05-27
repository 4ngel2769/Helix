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
        console.log(`[DEBUG] Message received: ${message.content}`);
        
        // Ignore messages from bots
        if (message.author.bot) {
            console.log('[DEBUG] Ignoring bot message');
            return;
        }
        
        // Check if bot is mentioned using mentions.users (more reliable)
        const botMentioned = message.mentions.users.has(this.container.client.user!.id);
        console.log(`[DEBUG] Bot mentioned: ${botMentioned}`);
        
        if (!botMentioned) return;
        
        // Alternative mention check: both direct pings and message content check
        console.log(`[DEBUG] Bot ID: ${this.container.client.user!.id}`);
        console.log(`[DEBUG] Message content: "${message.content}"`);
        
        // Simplified mention checking - Discord.js handles different mention formats internally
        if (message.content.includes(`<@${this.container.client.user!.id}>`)) {
            console.log('[DEBUG] Bot mention found in content');
        } else {
            console.log('[DEBUG] No bot mention found in content (string check)');
            // Continue anyway since we already confirmed via mentions.users
        }

        try {
            const prefix = this.container.client.options.defaultPrefix;
            // console.log(`[DEBUG] Prefix: ${prefix}`);
            
            // Safely check for application commands
            // console.log('[DEBUG] Checking for help command ID');
            let helpSlashMention = '/help';
            
            if (this.container.client.application) {
                try {
                    // Force fetch application commands if they might not be cached
                    if (!this.container.client.application.commands.cache.size) {
                        // console.log('[DEBUG] Commands not cached, fetching...');
                        await this.container.client.application.commands.fetch();
                    }
                    
                    const helpCommandId = this.container.client.application.commands.cache.find(
                        cmd => cmd.name === 'help'
                    )?.id;
                    
                    // console.log(`[DEBUG] Help command ID: ${helpCommandId || 'not found'}`);
                    
                    if (helpCommandId) {
                        helpSlashMention = `</${'help'}:${helpCommandId}>`;
                    }
                } catch (error) {
                    console.error('[ERROR] Failed to fetch application commands:', error);
                }
            }
            // else {
            //     console.log('[DEBUG] Client application not available');
            // }
            
            const responseContent = prefix
                ? `My prefix in this guild is: \`${prefix}\`\nTo get started, use \`${prefix}help\` or ${helpSlashMention}`
                : `To get started, use ${helpSlashMention}`;
            
            // console.log(`[DEBUG] Responding with: "${responseContent}"`);
                
            if (message.channel.isSendable()) {
                await message.reply({
                    content: responseContent,
                    allowedMentions: { repliedUser: false }
                });
                // console.log('[DEBUG] Reply sent successfully');
            } 
            // else {
            //     console.log('[DEBUG] Channel is not sendable');
            // }
        } catch (error) {
            console.error('[ERROR] Error in messageCreate event:', error);
        }
    }
}