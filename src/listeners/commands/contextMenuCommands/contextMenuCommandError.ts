import { Events, Listener, type ContextMenuCommandErrorPayload } from '@sapphire/framework';
import { notifyInteractionFailure } from '../../../lib/utils/errorNotice';

/**
 * Context menu commands had no error listener at all, so a throw left the user
 * with an unacknowledged interaction and no message.
 */
export class ContextMenuCommandErrorListener extends Listener<typeof Events.ContextMenuCommandError> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.ContextMenuCommandError });
	}

	public override async run(error: unknown, payload: ContextMenuCommandErrorPayload) {
		const { interaction, command } = payload;

		this.container.logger.error(
			`[command-error] context menu "${command.name}" failed (guild: ${interaction.guildId ?? 'DM'}, user: ${interaction.user.id})`,
			error
		);

		await notifyInteractionFailure(
			interaction,
			`\`${command.name}\` could not be completed. The error has been logged — please try again in a moment.`
		);
	}
}
