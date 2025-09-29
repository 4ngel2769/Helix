import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ColorResolvable } from 'discord.js';
import { EconomyService } from '../lib/services/EconomyService';
import config from '../config';

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
            const expirationTime = parseInt(customIdParts[3]);

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

            const inventory = result.inventory;
            
            // Fix NaN calculation by ensuring proper number handling
            const totalValue = inventory.reduce((sum, item) => {
                const sellPrice = Number(item.sellPrice) || 0;
                const quantity = Number(item.quantity) || 0;
                return sum + (sellPrice * quantity);
            }, 0);
            
            const itemCount = inventory.reduce((sum, item) => {
                const quantity = Number(item.quantity) || 0;
                return sum + quantity;
            }, 0);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle(`📦 ${targetUser.displayName}'s Inventory - ${this.getCategoryDisplayName(category)}`)
                .setDescription(`**${itemCount.toLocaleString()}** items • Total Value: **${totalValue.toLocaleString()}** coins`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            if (category === 'all') {
                // Group items by category for 'all' view
                const categorizedItems = new Map<string, any[]>();
                
                for (const item of inventory) {
                    const cat = item.category || 'misc';
                    if (!categorizedItems.has(cat)) {
                        categorizedItems.set(cat, []);
                    }
                    categorizedItems.get(cat)!.push(item);
                }

                // Add fields for each category
                for (const [cat, items] of categorizedItems) {
                    if (items.length === 0) continue;

                    const itemList = items.slice(0, 8).map(item => {
                        const rarity = this.getRarityEmoji(item.rarity);
                        const sellPrice = Number(item.sellPrice) || 0;
                        const quantity = Number(item.quantity) || 0;
                        const sellable = item.sellable !== false;
                        
                        let priceText = '';
                        if (sellable && sellPrice > 0) {
                            priceText = `(${sellPrice.toLocaleString()}c each)`;
                        } else if (!sellable) {
                            priceText = '(Not Sellable)';
                        } else {
                            priceText = '(No Value)';
                        }
                        
                        return `${rarity} **${quantity.toLocaleString()}x** ${item.name || 'Unknown Item'} ${priceText}`;
                    }).join('\n');

                    const moreItems = items.length > 8 ? `\n*...and ${items.length - 8} more*` : '';

                    embed.addFields({
                        name: `${this.getCategoryEmoji(cat)} ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${items.length})`,
                        value: itemList + moreItems || 'No items',
                        inline: false
                    });
                }
            } else {
                // Show items for specific category
                const categoryItems = inventory.filter(item => 
                    (item.category || 'misc').toLowerCase() === category.toLowerCase()
                );

                if (categoryItems.length > 0) {
                    const itemList = categoryItems.slice(0, 15).map(item => {
                        const rarity = this.getRarityEmoji(item.rarity);
                        const sellPrice = Number(item.sellPrice) || 0;
                        const quantity = Number(item.quantity) || 0;
                        const sellable = item.sellable !== false;
                        
                        let priceText = '';
                        if (sellable && sellPrice > 0) {
                            priceText = `(${sellPrice.toLocaleString()}c each)`;
                        } else if (!sellable) {
                            priceText = '(Not Sellable)';
                        } else {
                            priceText = '(No Value)';
                        }
                        
                        return `${rarity} **${quantity.toLocaleString()}x** ${item.name || 'Unknown Item'} ${priceText}`;
                    }).join('\n');

                    const moreItems = categoryItems.length > 15 ? `\n*...and ${categoryItems.length - 15} more*` : '';

                    embed.addFields({
                        name: `${this.getCategoryEmoji(category)} Items in this category`,
                        value: itemList + moreItems || 'No items',
                        inline: false
                    });
                } else {
                    embed.addFields({
                        name: `${this.getCategoryEmoji(category)} Items in this category`,
                        value: 'No items found in this category.',
                        inline: false
                    });
                }
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
        // Create disabled buttons
        const disabledRow1 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('expired_tools')
                    .setLabel('Tools')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔧')
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('expired_weapons')
                    .setLabel('Weapons')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚔️')
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('expired_consumables')
                    .setLabel('Consumables')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🧪')
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('expired_materials')
                    .setLabel('Materials')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔩')
                    .setDisabled(true)
            );

        const disabledRow2 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('expired_collectibles')
                    .setLabel('Collectibles')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('💎')
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('expired_all')
                    .setLabel('All Items')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📦')
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('expired_refresh')
                    .setLabel('Expired')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⏰')
                    .setDisabled(true)
            );

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

    private async handleRefresh(interaction: ButtonInteraction, targetUser: any) {
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

            const inventory = result.inventory;
            
            // Fix NaN calculation by ensuring proper number handling
            const totalValue = inventory.reduce((sum, item) => {
                const sellPrice = Number(item.sellPrice) || 0;
                const quantity = Number(item.quantity) || 0;
                return sum + (sellPrice * quantity);
            }, 0);
            
            const itemCount = inventory.reduce((sum, item) => {
                const quantity = Number(item.quantity) || 0;
                return sum + quantity;
            }, 0);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle(`📦 ${targetUser.displayName}'s Inventory (Refreshed)`)
                .setDescription(`**${itemCount.toLocaleString()}** items • Total Value: **${totalValue.toLocaleString()}** coins`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            // Group items by category
            const categorizedItems = new Map<string, any[]>();
            
            for (const item of inventory) {
                const cat = item.category || 'misc';
                if (!categorizedItems.has(cat)) {
                    categorizedItems.set(cat, []);
                }
                categorizedItems.get(cat)!.push(item);
            }

            // Add fields for each category
            for (const [cat, items] of categorizedItems) {
                if (items.length === 0) continue;

                const itemList = items.slice(0, 10).map(item => {
                    const rarity = this.getRarityEmoji(item.rarity);
                    const sellPrice = Number(item.sellPrice) || 0;
                    const quantity = Number(item.quantity) || 0;
                    const sellable = item.sellable !== false;
                    
                    let priceText = '';
                    if (sellable && sellPrice > 0) {
                        priceText = `(${sellPrice.toLocaleString()}c each)`;
                    } else if (!sellable) {
                        priceText = '(Not Sellable)';
                    } else {
                        priceText = '(No Value)';
                    }
                    
                    return `${rarity} **${quantity.toLocaleString()}x** ${item.name || 'Unknown Item'} ${priceText}`;
                }).join('\n');

                const moreItems = items.length > 10 ? `\n*...and ${items.length - 10} more*` : '';

                embed.addFields({
                    name: `${this.getCategoryEmoji(cat)} ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${items.length})`,
                    value: itemList + moreItems || 'No items',
                    inline: false
                });
            }

            // Create new buttons with fresh expiration time
            const newExpirationTime = Date.now() + 300000; // 5 minutes
            const row1 = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`inventory_tools_${targetUser.id}_${newExpirationTime}`)
                        .setLabel('Tools')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔧'),
                    new ButtonBuilder()
                        .setCustomId(`inventory_weapons_${targetUser.id}_${newExpirationTime}`)
                        .setLabel('Weapons')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⚔️'),
                    new ButtonBuilder()
                        .setCustomId(`inventory_consumables_${targetUser.id}_${newExpirationTime}`)
                        .setLabel('Consumables')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🧪'),
                    new ButtonBuilder()
                        .setCustomId(`inventory_materials_${targetUser.id}_${newExpirationTime}`)
                        .setLabel('Materials')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔩')
                );

            const row2 = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`inventory_collectibles_${targetUser.id}_${newExpirationTime}`)
                        .setLabel('Collectibles')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('💎'),
                    new ButtonBuilder()
                        .setCustomId(`inventory_all_${targetUser.id}_${newExpirationTime}`)
                        .setLabel('All Items')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📦'),
                    new ButtonBuilder()
                        .setCustomId(`inventory_refresh_${targetUser.id}_${newExpirationTime}`)
                        .setLabel('Refresh')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🔄')
                );

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

    private getCategoryDisplayName(category: string): string {
        switch (category.toLowerCase()) {
            case 'all': return 'All Items';
            case 'tools': return 'Tools';
            case 'weapons': return 'Weapons';
            case 'consumables': return 'Consumables';
            case 'materials': return 'Materials';
            case 'collectibles': return 'Collectibles';
            default: return category.charAt(0).toUpperCase() + category.slice(1);
        }
    }

    private getRarityEmoji(rarity: string): string {
        switch (rarity?.toLowerCase()) {
            case 'common': return '⚪';
            case 'uncommon': return '🟢';
            case 'rare': return '🔵';
            case 'epic': return '🟣';
            case 'legendary': return '🟡';
            case 'mythical': return '🔴';
            case 'divine': return '✨';
            case 'cursed': return '💀';
            default: return '⚪';
        }
    }

    private getCategoryEmoji(category: string): string {
        switch (category?.toLowerCase()) {
            case 'tools': return '🔧';
            case 'weapons': return '⚔️';
            case 'armor': return '🛡️';
            case 'consumables': return '🧪';
            case 'materials': return '🔩';
            case 'collectibles': return '💎';
            case 'food': return '🍎';
            case 'drinks': return '🥤';
            case 'scrolls': return '📜';
            case 'books': return '📚';
            case 'potions': return '🧪';
            case 'gems': return '💎';
            case 'currencies': return '💰';
            default: return '📦';
        }
    }
}
