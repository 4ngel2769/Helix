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
        
        // Add any custom message handling logic here if needed
        // Note: Mention-only responses are handled by mentionPrefixOnly.ts listener
        // using the Events.MentionPrefixOnly event from Sapphire framework
    }
}