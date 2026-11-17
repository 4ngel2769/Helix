import { Events, Listener, type ContextMenuCommand } from '@sapphire/framework';
import type { ContextMenuCommandInteraction } from 'discord.js';
import { trackUserActivity } from '../lib/utils/userActivity';

export class TrackContextMenuCommandListener extends Listener<typeof Events.ContextMenuCommandRun> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.ContextMenuCommandRun });
	}

	public override run(interaction: ContextMenuCommandInteraction, command: ContextMenuCommand) {
		void trackUserActivity({
			userId: interaction.user.id,
			username: interaction.user.username,
			avatarHash: interaction.user.avatar,
			commandName: command.name
		});
	}
}
