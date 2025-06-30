import { AllFlowsPrecondition } from '@sapphire/framework';
import { envParseArray } from '@skyra/env-utilities';
import type { CommandInteraction, ContextMenuCommandInteraction, Message, Snowflake } from 'discord.js';
import { Config } from '../config'
import configModule from '../config.js';

const config = configModule as Config;

const OWNERS = envParseArray('OWNERS');

// Fetch usernames of the bot developers (async, so you may want to use this in a command or setup function)
const developerUsernames: string[] = [];
config.bot.ownerIDs.forEach(async (id) => {
    // You need a Discord client instance to fetch users, so this is just an example:
    // const user = await client.users.fetch(id);
    // developerUsernames.push(user.username);
    // For now, just push the ID as a placeholder:
    developerUsernames.push(id);
});

export class UserPrecondition extends AllFlowsPrecondition {
    #message = `This command can only be used by the bot developer(s):`+ ` ${config.bot.ownerIDs.join(', ')}.`;

    public override chatInputRun(interaction: CommandInteraction) {
        return this.doOwnerCheck(interaction.user.id);
    }

    public override contextMenuRun(interaction: ContextMenuCommandInteraction) {
        return this.doOwnerCheck(interaction.user.id);
    }

    public override messageRun(message: Message) {
        return this.doOwnerCheck(message.author.id);
    }

    private doOwnerCheck(userId: Snowflake) {
        return OWNERS.includes(userId) ? this.ok() : this.error({ message: this.#message });
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        OwnerOnly: never;
    }
}
