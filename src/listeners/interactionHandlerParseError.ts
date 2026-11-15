import { Events, Listener, type InteractionHandlerParseError } from '@sapphire/framework';
import { notifyInteractionFailure } from '../lib/utils/errorNotice';

/**
 * A component whose `customId` cannot be parsed to a handler never runs, so no
 * other listener fires and Discord shows "This interaction failed".
 */
export class InteractionHandlerParseErrorListener extends Listener<typeof Events.InteractionHandlerParseError> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.InteractionHandlerParseError });
	}

	public override async run(error: unknown, payload: InteractionHandlerParseError) {
		const { interaction, handler } = payload;

		this.container.logger.error(`[interaction-parse-error] handler "${handler.name}" could not be resolved`, error);

		if (!interaction.isRepliable()) return;

		await notifyInteractionFailure(
			interaction,
			'That action is no longer available. Please run the command again.'
		);
	}
}
