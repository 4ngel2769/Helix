import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { MessageFlags } from 'discord-api-types/v10';

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
    public override parse(interaction: ButtonInteraction) {
        // List of buttons that are handled by other specialized handlers or by commands themselves
        const handledElsewhere = [
            'new-meme',
            'verify-button', 
            'my-awesome-button',
            'note_back',
            'bank_upgrade_cancel',
            // Help command pagination buttons (handled by the help command collector)
            'previous',
            'next'
        ];

        // Check for buttons that start with specific prefixes
        const prefixHandled = [
            'note_prev_',
            'note_next_', 
            'note_delete_',
            'auction_',
            'bank_upgrade_confirm_',
            'inventory_'
        ];

        if (handledElsewhere.includes(interaction.customId)) {
            return this.none();
        }

        if (prefixHandled.some(prefix => interaction.customId.startsWith(prefix))) {
            return this.none();
        }

        return this.some();
    }

    public async run(interaction: ButtonInteraction) {
        await interaction.reply({
            content: 'Unknown button interaction.',
            flags: MessageFlags.Ephemeral
        });
    }
}
