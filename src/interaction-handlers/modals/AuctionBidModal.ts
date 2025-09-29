import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ModalSubmitInteraction } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { AuctionService } from '../../lib/services/AuctionService';
import config from '../../config';

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class AuctionBidModal extends InteractionHandler {
    public override parse(interaction: ModalSubmitInteraction) {
        if (!interaction.customId.startsWith('auction_place_bid_')) return this.none();
        return this.some();
    }

    public override async run(interaction: ModalSubmitInteraction) {
        await interaction.deferReply({ ephemeral: true });

        const auctionId = interaction.customId.replace('auction_place_bid_', '');
        const bidAmountStr = interaction.fields.getTextInputValue('bid_amount');
        const bidAmount = parseInt(bidAmountStr.replace(/[,\s]/g, ''));

        if (isNaN(bidAmount) || bidAmount < 1) {
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Invalid Bid')
                .setDescription('Please enter a valid bid amount.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        try {
            const result = await AuctionService.placeBid(interaction.user.id, auctionId, bidAmount);

            if (!result.success) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err)
                    .setTitle('❌ Bid Failed')
                    .setDescription(result.message)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success)
                .setTitle('🔨 Bid Placed!')
                .setDescription(`Your bid has been placed successfully!`)
                .addFields(
                    {
                        name: 'Auction',
                        value: `${result.auction!.quantity}x ${result.auction!.item.name}`,
                        inline: true
                    },
                    {
                        name: 'Your Bid',
                        value: `💸 **${bidAmount.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: 'Previous Highest',
                        value: `💰 **${result.previousBid!.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: 'Auction Ends',
                        value: `<t:${Math.floor(result.auction!.endsAt.getTime() / 1000)}:R>`,
                        inline: false
                    }
                )
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error placing bid:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while placing your bid. Please try again.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }
}
