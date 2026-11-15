import { Events, Listener, type ChatInputCommandErrorPayload } from '@sapphire/framework';
import { notifyInteractionFailure } from '../../../lib/utils/errorNotice';

/**
 * Without this listener a thrown command leaves the interaction unacknowledged
 * and Discord shows "The application did not respond" with no explanation. Every
 * failure now reaches the user (ephemerally) and the logs with command context.
 */
export class ChatInputCommandErrorListener extends Listener<typeof Events.ChatInputCommandError> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.ChatInputCommandError });
	}

	public override async run(error: unknown, payload: ChatInputCommandErrorPayload) {
		const { interaction, command } = payload;

		const path = [command.name, interaction.options.getSubcommandGroup(false), interaction.options.getSubcommand(false)]
			.filter((part): part is string => typeof part === 'string' && part.length > 0)
			.join(' ');

		this.container.logger.error(
			`[command-error] /${path} failed (guild: ${interaction.guildId ?? 'DM'}, user: ${interaction.user.id})`,
			error
		);

		await notifyInteractionFailure(
			interaction,
			`\`/${path}\` could not be completed. The error has been logged — please try again in a moment.`
		);
	}
}
