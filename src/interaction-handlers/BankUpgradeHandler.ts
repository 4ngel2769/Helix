import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';

/**
 * Handles bank upgrade confirmation/cancel buttons.
 * These buttons are used by the bank-upgrade command's collector.
 */
@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class BankUpgradeHandler extends InteractionHandler {
    public override parse(interaction: ButtonInteraction) {
        const isBankUpgradeButton = 
            interaction.customId.startsWith('bank_upgrade_confirm_') ||
            interaction.customId === 'bank_upgrade_cancel';

        if (!isBankUpgradeButton) {
            return this.none();
        }

        return this.some();
    }

    public override async run(interaction: ButtonInteraction) {
        await interaction.deferUpdate();
        // Handler will receive this and process it
    }
}