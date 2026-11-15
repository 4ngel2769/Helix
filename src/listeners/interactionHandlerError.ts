import { Events, Listener, type InteractionHandlerError } from '@sapphire/framework';
import { notifyInteractionFailure } from '../lib/utils/errorNotice';

/**
 * Button/select/modal handlers fail without a precondition or command error
 * event, so a thrown handler used to leave the user staring at "This
 * interaction failed". Surface it like any other failure.
 */
export class InteractionHandlerErrorListener extends Listener<typeof Events.InteractionHandlerError> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.InteractionHandlerError });
	}

	public override async run(error: unknown, payload: InteractionHandlerError) {
		const { interaction, handler } = payload;

		this.container.logger.error(`[interaction-error] handler "${handler.name}" failed`, error);

		await notifyInteractionFailure(
			interaction,
			'That action could not be completed. The error has been logged — please try again in a moment.'
		);
	}
}
