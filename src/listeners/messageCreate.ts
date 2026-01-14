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
        
        // Add any custom message processing logic here
        // Note: Mention-only responses are handled by mentionPrefixOnly.ts listener to avoid duplicate responses
    }
}