import { ApplyOptions } from '@sapphire/decorators';
import { Precondition } from '@sapphire/framework';
import type { ChatInputCommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';
import { armInteractionAck } from '../lib/utils/interactionAck';

/**
 * Global precondition (`position: -1` puts it first) that arms the interaction
 * acknowledgement deadline before any command logic runs.
 *
 * Prefix commands have no three-second window, so `messageRun` is a no-op — but
 * it must exist, otherwise Sapphire rejects every prefix command with
 * `PreconditionMissingMessageHandler`.
 */
@ApplyOptions<Precondition.Options>({ position: -1 })
export class UserPrecondition extends Precondition {
	public override chatInputRun(interaction: ChatInputCommandInteraction) {
		armInteractionAck(interaction, `/${interaction.commandName}`);
		return this.ok();
	}

	public override contextMenuRun(interaction: ContextMenuCommandInteraction) {
		armInteractionAck(interaction, interaction.commandName);
		return this.ok();
	}

	public override messageRun(_message: Message) {
		return this.ok();
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		InteractionAck: never;
	}
}
