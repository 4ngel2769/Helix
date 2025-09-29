import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class BankUpgradeHandler extends InteractionHandler {
    public override parse(interaction: ButtonInteraction) {
        const isBankUpgradeButton = 
            interaction.customId.startsWith('bank_upgrade_confirm_') ||
            interaction.customId === 'bank_upgrade_cancel';

        // Return none to let the command's collector handle it
        if (!isBankUpgradeButton) {
            return this.none();
        }
        
        // Don't handle these buttons - let the collector handle them
        return this.none();
    }

    public override async run(interaction: ButtonInteraction) {
        // This should never be called since parse() returns none
        // But just in case, do nothing
    }
}