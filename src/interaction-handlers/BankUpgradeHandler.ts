import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { EmbedBuilder, ColorResolvable } from 'discord.js';
import { EconomyService } from '../lib/services/EconomyService';
import config from '../config';

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class BankUpgradeHandler extends InteractionHandler {
    public override parse(interaction: ButtonInteraction) {
        const bankUpgradeButtons = [
            interaction.customId.startsWith('bank_upgrade_confirm_'),
            interaction.customId === 'bank_upgrade_cancel'
        ];

        if (!bankUpgradeButtons.some(condition => condition === true || condition === interaction.customId)) {
            return this.none();
        }
        
        return this.some();
    }

    public override async run(interaction: ButtonInteraction) {
        // This is handled by the bank-upgrade command's collector
        // This handler is just to prevent "Unknown button interaction" messages
        return;
    }
}
