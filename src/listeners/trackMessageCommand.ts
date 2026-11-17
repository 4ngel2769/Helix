import { Events, Listener, type Command } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { trackUserActivity } from '../lib/utils/userActivity';

export class TrackMessageCommandListener extends Listener<typeof Events.MessageCommandRun> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.MessageCommandRun });
	}

	public override run(message: Message, command: Command) {
		void trackUserActivity({
			userId: message.author.id,
			username: message.author.username,
			avatarHash: message.author.avatar,
			commandName: command.name
		});
	}
}
