import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { AuctionService } from '../lib/services/AuctionService';
import config from '../config';

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class AuctionHandler extends InteractionHandler {
    public override parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith('auction_')) return this.none();
        return this.some();
    }

    public override async run(interaction: ButtonInteraction) {
        const [action, subAction, id] = interaction.customId.split('_');

        switch (subAction) {
            case 'bid':
                return this.handleBidModal(interaction, id);
            case 'refresh':
                return this.handleRefresh(interaction);
            case 'filter':
                return this.handleFilter(interaction, id);
            default:
                return this.handleRefresh(interaction);
        }
    }

    private async handleBidModal(interaction: ButtonInteraction, auctionId: string) {
        try {
            const auction = await AuctionService.getAuction(auctionId);
            
            if (!auction.success || !auction.auction) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err)
                    .setTitle('❌ Auction Not Found')
                    .setDescription('This auction no longer exists or has ended.')
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const minBid = auction.auction.currentBid + 1;

            const modal = new ModalBuilder()
                .setCustomId(`auction_place_bid_${auctionId}`)
                .setTitle('Place Bid');

            const bidInput = new TextInputBuilder()
                .setCustomId('bid_amount')
                .setLabel(`Minimum bid: ${minBid.toLocaleString()} coins`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(`Enter bid amount (min: ${minBid.toLocaleString()})`)
                .setRequired(true);

            const row = new ActionRowBuilder<TextInputBuilder>().addComponents(bidInput);
            modal.addComponents(row);

            return interaction.showModal(modal);

        } catch (error) {
            console.error('Error handling bid modal:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred. Please try again.')
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }

    private async handleRefresh(interaction: ButtonInteraction) {
        await interaction.deferUpdate();
        
        try {
            const result = await AuctionService.getAuctions(interaction.user.id, 'all');

            if (!result.success || !result.auctions || result.auctions.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.warn)
                    .setTitle('📋 No Auctions Found')
                    .setDescription('There are no active auctions at this time.')
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed], components: [] });
            }

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default)
                .setTitle('🔨 Active Auctions (Refreshed)')
                .setDescription(`Showing ${result.auctions.length} auction(s)`)
                .setTimestamp();

            for (const auction of result.auctions.slice(0, 10)) {
                const timeLeft = auction.endsAt.getTime() - Date.now();
                const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
                const minutesLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)));

                embed.addFields({
                    name: `${auction.quantity}x ${auction.item.name} (ID: ${auction.id.slice(-8)})`,
                    value: `💰 Current Bid: **${auction.currentBid.toLocaleString()}** coins\n` +
                           `👤 Seller: <@${auction.sellerId}>\n` +
                           `⏰ Time Left: ${hoursLeft}h ${minutesLeft}m`,
                    inline: true
                });
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error refreshing auctions:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while refreshing. Please try again.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private async handleFilter(interaction: ButtonInteraction, filter: string) {
        await interaction.deferUpdate();

        try {
            const result = await AuctionService.getAuctions(interaction.user.id, filter);

            const filterNames: Record<string, string> = {
                'mine': 'My Auctions',
                'bids': 'My Bids',
                'ending': 'Ending Soon',
                'all': 'All Auctions'
            };

            if (!result.success || !result.auctions || result.auctions.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.warn)
                    .setTitle('📋 No Auctions Found')
                    .setDescription(`No auctions found for filter: ${filterNames[filter] || filter}`)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default)
                .setTitle(`🔨 ${filterNames[filter] || 'Filtered Auctions'}`)
                .setDescription(`Showing ${result.auctions.length} auction(s)`)
                .setTimestamp();

            for (const auction of result.auctions.slice(0, 10)) {
                const timeLeft = auction.endsAt.getTime() - Date.now();
                const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
                const minutesLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)));

                embed.addFields({
                    name: `${auction.quantity}x ${auction.item.name} (ID: ${auction.id.slice(-8)})`,
                    value: `💰 Current Bid: **${auction.currentBid.toLocaleString()}** coins\n` +
                           `👤 Seller: <@${auction.sellerId}>\n` +
                           `⏰ Time Left: ${hoursLeft}h ${minutesLeft}m`,
                    inline: true
                });
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error filtering auctions:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while filtering. Please try again.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }
}
