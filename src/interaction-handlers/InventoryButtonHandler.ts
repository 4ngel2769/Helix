import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction, User } from 'discord.js';
import { EmbedBuilder, ColorResolvable } from 'discord.js';
import { EconomyService } from '../lib/services/EconomyService';
import config from '../config';
import {
    addGroupedInventoryFields,
    addSingleCategoryField,
    buildInventoryFilterButtonRows,
    calculateInventoryStats,
    getCategoryDisplayName,
    groupInventoryByCategory,
    type InventoryDisplayItem
} from '../lib/utils/inventoryDisplay';

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class InventoryButtonHandler extends InteractionHandler {
    public override parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith('inventory_')) return this.none();
        return this.some();
    }

    public override async run(interaction: ButtonInteraction) {
        await interaction.deferUpdate();

        try {
            const customIdParts = interaction.customId.split('_');
            const category = customIdParts[1];
            const userId = customIdParts[2];
            const expirationTime = Number(customIdParts[3]);

            if (!category || !userId || Number.isNaN(expirationTime)) {
                return interaction.followUp({
                    content: '❌ Invalid inventory interaction data. Please run `/inventory` again.',
                    ephemeral: true
                });
            }

            // Check if buttons have expired (5 minutes)
            if (Date.now() > expirationTime) {
                return this.handleExpiredButtons(interaction);
            }

            // Check if user is trying to interact with someone else's inventory
            if (userId !== interaction.user.id) {
                return interaction.followUp({
                    content: '❌ You can only interact with your own inventory buttons.',
                    ephemeral: true
                });
            }

            const targetUser = interaction.user;

            // Handle refresh separately
            if (category === 'refresh') {
                return this.handleRefresh(interaction, targetUser);
            }

            // Fetch inventory with the selected category
            const result = await EconomyService.getUserInventory(targetUser.id, category);

            if (!result.success || !result.inventory || result.inventory.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.warn as ColorResolvable)
                    .setTitle('📦 Empty Category')
                    .setDescription(category === 'all' ? 
                        `You have no items in your inventory.` :
                        `You have no items in the **${category}** category.`)
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setTimestamp();

                // Keep the original buttons but update content
                const originalComponents = interaction.message.components;
                return interaction.editReply({ embeds: [embed], components: originalComponents });
            }

            const inventory = result.inventory as InventoryDisplayItem[];
            const { totalValue, itemCount } = calculateInventoryStats(inventory);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle(`📦 ${targetUser.displayName}'s Inventory - ${getCategoryDisplayName(category)}`)
                .setDescription(`**${itemCount.toLocaleString()}** items • Total Value: **${totalValue.toLocaleString()}** coins`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            if (category === 'all') {
                addGroupedInventoryFields(embed, groupInventoryByCategory(inventory), 8, {
                    includeEachSuffix: true,
                    showNoValue: true
                });
            } else {
                const categoryItems = inventory.filter(item => 
                    (item.category || 'misc').toLowerCase() === category.toLowerCase()
                );

                addSingleCategoryField(embed, category, categoryItems, 15, {
                    includeEachSuffix: true,
                    showNoValue: true
                });
            }

            // Keep the original buttons
            const originalComponents = interaction.message.components;
            return interaction.editReply({ embeds: [embed], components: originalComponents });

        } catch (error) {
            console.error('Error handling inventory button:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Error')
                .setDescription('An error occurred while filtering the inventory. Please try again.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed], components: [] });
        }
    }

    private async handleExpiredButtons(interaction: ButtonInteraction) {
        const [disabledRow1, disabledRow2] = buildInventoryFilterButtonRows('', 0, 'expired');

        // Get current embed and add expiration notice
        const currentEmbed = interaction.message.embeds[0];
        if (currentEmbed) {
            const updatedEmbed = new EmbedBuilder(currentEmbed.data)
                .setFooter({ text: '⏰ Buttons have expired. Use /inventory to get new ones.' });

            return interaction.editReply({ 
                embeds: [updatedEmbed], 
                components: [disabledRow1, disabledRow2] 
            });
        }

        return interaction.editReply({ 
            components: [disabledRow1, disabledRow2] 
        });
    }

    private async handleRefresh(interaction: ButtonInteraction, targetUser: User) {
        try {
            // Fetch fresh inventory data
            const result = await EconomyService.getUserInventory(targetUser.id, 'all');

            if (!result.success || !result.inventory || result.inventory.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.warn as ColorResolvable)
                    .setTitle('📦 Empty Inventory')
                    .setDescription(`You have no items in your inventory.`)
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed], components: [] });
            }

            const inventory = result.inventory as InventoryDisplayItem[];
            const { totalValue, itemCount } = calculateInventoryStats(inventory);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle(`📦 ${targetUser.displayName}'s Inventory (Refreshed)`)
                .setDescription(`**${itemCount.toLocaleString()}** items • Total Value: **${totalValue.toLocaleString()}** coins`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            addGroupedInventoryFields(embed, groupInventoryByCategory(inventory), 10, {
                includeEachSuffix: true,
                showNoValue: true
            });

            // Create new buttons with fresh expiration time
            const newExpirationTime = Date.now() + 300000; // 5 minutes
            const [row1, row2] = buildInventoryFilterButtonRows(targetUser.id, newExpirationTime, 'active');

            return interaction.editReply({ 
                embeds: [embed], 
                components: [row1, row2] 
            });

        } catch (error) {
            console.error('Error refreshing inventory:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Refresh Failed')
                .setDescription('Failed to refresh inventory. Please try again.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

}
