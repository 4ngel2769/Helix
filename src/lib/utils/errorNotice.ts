import { container } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags, type BaseInteraction, type ColorResolvable } from 'discord.js';
import config from '../../config';
import { clearInteractionAck } from './interactionAck';

/**
 * Tell the user that an interaction failed.
 *
 * Discord's own failure mode for an unhandled interaction is silence ("The
 * application did not respond" or "This interaction failed"), which looks like
 * a dead bot. Every error listener funnels through here so a failure always
 * produces one ephemeral message and never a second exception.
 */
export async function notifyInteractionFailure(interaction: BaseInteraction, description: string): Promise<void> {
	clearInteractionAck(interaction);

	// Autocomplete interactions cannot carry embeds and are answered elsewhere.
	if (!interaction.isRepliable()) return;

	const embed = new EmbedBuilder()
		.setColor(config.bot.embedColor.err as ColorResolvable)
		.setTitle('Something went wrong')
		.setDescription(description);

	try {
		if (interaction.deferred) {
			await interaction.editReply({ embeds: [embed] });
		} else if (interaction.replied) {
			await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		}
	} catch (replyError) {
		container.logger.warn('[error-notice] could not notify the user:', replyError);
	}
}
