import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { EmbedBuilder, ColorResolvable } from 'discord.js';
import config from '../config';

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
        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.warn as ColorResolvable)
            .setTitle('⏰ Interaction Expired')
            .setDescription('This bank upgrade confirmation has expired. Please run the command again.')
            .setTimestamp();

        try {
            await interaction.update({ embeds: [embed], components: [] });
        } catch (error) {
            // If update fails, try reply
            try {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            } catch (replyError) {
                console.error('Failed to respond to expired bank upgrade interaction:', replyError);
            }
        }
    }
}
