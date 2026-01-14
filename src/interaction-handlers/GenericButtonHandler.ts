import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { MessageFlags } from 'discord-api-types/v10';

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class GenericButtonHandler extends InteractionHandler {
    public override parse(interaction: ButtonInteraction) {
        const genericButtons = ['my-awesome-button'];
        
        if (!genericButtons.includes(interaction.customId)) return this.none();
        return this.some();
    }

    public async run(interaction: ButtonInteraction) {
        try {
            switch (interaction.customId) {
                case 'my-awesome-button':
                    await interaction.reply({
                        content: 'Hello from a button interaction handler!',
                        flags: MessageFlags.Ephemeral
                    });
                    break;
                    
                default:
                    await interaction.reply({
                        content: 'Unknown button interaction.',
                        flags: MessageFlags.Ephemeral
                    });
            }
        } catch (error) {
            this.container.logger.error('Error in GenericButtonHandler:', error);
        }
    }
}
