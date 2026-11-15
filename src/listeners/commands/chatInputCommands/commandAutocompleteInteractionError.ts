import { Events, Listener, type AutocompleteInteractionPayload } from '@sapphire/framework';

/**
 * An autocomplete handler has three seconds and only one shot at responding. A
 * throw leaves the option list spinning forever, so always answer — an empty
 * list is a valid response and closes the picker.
 */
export class CommandAutocompleteInteractionErrorListener extends Listener<typeof Events.CommandAutocompleteInteractionError> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.CommandAutocompleteInteractionError });
	}

	public override async run(error: unknown, payload: AutocompleteInteractionPayload) {
		const { interaction, command } = payload;

		this.container.logger.error(
			`[autocomplete-error] ${command.name} failed (guild: ${interaction.guildId ?? 'DM'}, user: ${interaction.user.id})`,
			error
		);

		try {
			if (!interaction.responded) await interaction.respond([]);
		} catch (respondError) {
			this.container.logger.warn(`[autocomplete-error] could not respond for ${command.name}:`, respondError);
		}
	}
}
