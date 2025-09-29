import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { EconomyModule } from '../../modules/Economy';
import { EmbedBuilder, MessageFlags, Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, ColorResolvable } from 'discord.js';
import config from '../../config';
import { EconomyService } from '../../lib/services/EconomyService';

@ApplyOptions<Command.Options>({
    name: 'inventory',
    description: 'View your or another user\'s inventory',
    aliases: ['inv', 'bag']
})
export class InventoryCommand extends ModuleCommand<EconomyModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Economy',
            description: 'View your or another user\'s inventory',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('inventory')
                .setDescription('View your or another user\'s inventory')
                .addUserOption((option) =>
                    option
                        .setName('user')
                        .setDescription('User to view inventory for (defaults to yourself)')
                        .setRequired(false)
                )
                .addStringOption((option) =>
                    option
                        .setName('category')
                        .setDescription('Filter by item category')
                        .setRequired(false)
                        .addChoices(
                            { name: 'All', value: 'all' },
                            { name: 'Tools', value: 'tools' },
                            { name: 'Weapons', value: 'weapons' },
                            { name: 'Consumables', value: 'consumables' },
                            { name: 'Materials', value: 'materials' },
                            { name: 'Collectibles', value: 'collectibles' }
                        )
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const category = interaction.options.getString('category') || 'all';

        try {
            const result = await EconomyService.getUserInventory(targetUser.id, category);

            if (!result.success || !result.inventory || result.inventory.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.warn as ColorResolvable)
                    .setTitle('📦 Empty Inventory')
                    .setDescription(category === 'all' ? 
                        `${targetUser.displayName} has no items in their inventory.` :
                        `${targetUser.displayName} has no items in the **${category}** category.`)
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const inventory = result.inventory;
            
            // Fix NaN calculation with extra safety checks
            const totalValue = inventory.reduce((sum, item) => {
                const sellPrice = Number(item.sellPrice) || 0;
                const quantity = Number(item.quantity) || 0;
                const itemValue = sellPrice * quantity;
                return sum + (isNaN(itemValue) ? 0 : itemValue);
            }, 0);
            
            const itemCount = inventory.reduce((sum, item) => {
                const quantity = Number(item.quantity) || 0;
                return sum + (isNaN(quantity) ? 0 : quantity);
            }, 0);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle(`📦 ${targetUser.displayName}'s Inventory`)
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

            // Create filter buttons with expiration timestamp
            const expirationTime = Date.now() + 300000; // 5 minutes
            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`inventory_tools_${targetUser.id}_${expirationTime}`)
                        .setLabel('Tools')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔧'),
                    new ButtonBuilder()
                        .setCustomId(`inventory_weapons_${targetUser.id}_${expirationTime}`)
                        .setLabel('Weapons')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⚔️'),
                    new ButtonBuilder()
                        .setCustomId(`inventory_consumables_${targetUser.id}_${expirationTime}`)
                        .setLabel('Consumables')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🧪'),
                    new ButtonBuilder()
                        .setCustomId(`inventory_materials_${targetUser.id}_${expirationTime}`)
                        .setLabel('Materials')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔩')
                );

            const row2 = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`inventory_collectibles_${targetUser.id}_${expirationTime}`)
                        .setLabel('Collectibles')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('💎'),
                    new ButtonBuilder()
                        .setCustomId(`inventory_all_${targetUser.id}_${expirationTime}`)
                        .setLabel('All Items')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📦'),
                    new ButtonBuilder()
                        .setCustomId(`inventory_refresh_${targetUser.id}_${expirationTime}`)
                        .setLabel('Refresh')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🔄')
                );

            return interaction.editReply({ 
                embeds: [embed], 
                components: [row, row2] 
            });

        } catch (error) {
            console.error('Error viewing inventory:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Error')
                .setDescription('An error occurred while fetching the inventory. Please try again.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    public override async messageRun(message: Message) {
        const args = message.content.split(' ').slice(1);
        let targetUser = message.author;

        // Parse user mention or ID from args
        if (args.length > 0) {
            const userMention = args[0];
            const userId = userMention.replace(/[<@!>]/g, '');
            try {
                const user = await message.client.users.fetch(userId);
                if (user) targetUser = user;
            } catch {
                // Keep original user if fetch fails
            }
        }

        try {
            const result = await EconomyService.getUserInventory(targetUser.id, 'all');

            if (!result.success || !result.inventory || result.inventory.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.warn as ColorResolvable)
                    .setTitle('📦 Empty Inventory')
                    .setDescription(`${targetUser.displayName} has no items in their inventory.`)
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            const inventory = result.inventory;
            
            // Fix NaN calculation for message command too
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
                .setTitle(`📦 ${targetUser.displayName}'s Inventory`)
                .setDescription(`**${itemCount.toLocaleString()}** items • Total Value: **${totalValue.toLocaleString()}** coins`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            // Group items by category (simplified for text command)
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

                const itemList = items.slice(0, 5).map(item => {
                    const rarity = this.getRarityEmoji(item.rarity);
                    const sellPrice = Number(item.sellPrice) || 0;
                    const quantity = Number(item.quantity) || 0;
                    const sellable = item.sellable !== false;
                    
                    let priceText = '';
                    if (sellable && sellPrice > 0) {
                        priceText = `(${sellPrice.toLocaleString()}c)`;
                    } else if (!sellable) {
                        priceText = '(Not Sellable)';
                    }
                    
                    return `${rarity} **${quantity.toLocaleString()}x** ${item.name || 'Unknown Item'} ${priceText}`;
                }).join('\n');

                const moreItems = items.length > 5 ? `\n*...and ${items.length - 5} more*` : '';

                embed.addFields({
                    name: `${this.getCategoryEmoji(cat)} ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${items.length})`,
                    value: itemList + moreItems || 'No items',
                    inline: false
                });
            }

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error viewing inventory:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Error')
                .setDescription('An error occurred while fetching the inventory. Please try again.')
                .setTimestamp();

            return message.reply({ embeds: [embed] });
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
