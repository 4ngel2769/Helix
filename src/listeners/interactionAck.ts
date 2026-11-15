import { Events, Listener } from '@sapphire/framework';
import type { Interaction } from 'discord.js';
import { armInteractionAck } from '../lib/utils/interactionAck';

/**
 * Chat input/context menu commands are armed by the `InteractionAck`
 * precondition. Component and modal interactions never touch a precondition, so
 * they are armed here — otherwise a slow button handler fails with the same
 * silent "This interaction failed" the commands used to.
 */
export class InteractionAckListener extends Listener<typeof Events.InteractionCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.InteractionCreate });
	}

	public override run(interaction: Interaction) {
		if (interaction.isChatInputCommand() || interaction.isContextMenuCommand() || interaction.isAutocomplete()) return;
		if (!interaction.isButton() && !interaction.isAnySelectMenu() && !interaction.isModalSubmit()) return;
		armInteractionAck(interaction, `component:${interaction.customId}`);
	}
}
