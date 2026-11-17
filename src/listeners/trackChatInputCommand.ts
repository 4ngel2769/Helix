import { Events, Listener, type ChatInputCommand } from '@sapphire/framework';
import type { ChatInputCommandInteraction } from 'discord.js';
import { trackUserActivity } from '../lib/utils/userActivity';

export class TrackChatInputCommandListener extends Listener<typeof Events.ChatInputCommandRun> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.ChatInputCommandRun });
	}

	public override run(interaction: ChatInputCommandInteraction, command: ChatInputCommand) {
		void trackUserActivity({
			userId: interaction.user.id,
			username: interaction.user.username,
			avatarHash: interaction.user.avatar,
			commandName: command.name
		});
	}
}
