import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { EconomyModule } from '../../modules/Economy';
import { EmbedBuilder, MessageFlags, Message, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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
                    .setColor(config.bot.embedColor.warn)
                    .setTitle('📦 Empty Inventory')
                    .setDescription(`${targetUser.id === interaction.user.id ? 'Your' : `${targetUser.displayName}'s`} inventory is empty ${category !== 'all' ? `for category: ${category}` : ''}.`)
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const inventory = result.inventory;
            const totalValue = inventory.reduce((sum, item) => sum + (item.sellPrice || 0) * item.quantity, 0);
            const itemCount = inventory.reduce((sum, item) => sum + item.quantity, 0);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default)
                .setTitle(`📦 ${targetUser.displayName}'s Inventory`)
                .setDescription(`**${itemCount}** items • Total Value: **${totalValue.toLocaleString()}** coins`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            // Group items by category
            const categorizedItems = new Map<string, any[]>();
            
            for (const item of inventory) {
                const cat = item.category || 'other';
                if (!categorizedItems.has(cat)) {
                    categorizedItems.set(cat, []);
                }
                categorizedItems.get(cat)!.push(item);
            }

            // Add fields for each category
            for (const [cat, items] of categorizedItems) {
                if (items.length === 0) continue;

                const itemList = items
                    .sort((a, b) => b.quantity - a.quantity)
                    .slice(0, 10) // Show max 10 items per category
                    .map(item => {
                        const rarity = this.getRarityEmoji(item.rarity);
                        const value = item.sellPrice ? ` (${item.sellPrice.toLocaleString()} coins)` : '';
                        return `${rarity} **${item.quantity}x** ${item.name}${value}`;
                    })
                    .join('\n');

                const categoryEmoji = this.getCategoryEmoji(cat);
                const hiddenCount = items.length > 10 ? items.length - 10 : 0;
                const fieldValue = itemList + (hiddenCount > 0 ? `\n*...and ${hiddenCount} more*` : '');

                embed.addFields({
                    name: `${categoryEmoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${items.length})`,
                    value: fieldValue || 'None',
                    inline: false
                });
            }

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`inventory_tools_${targetUser.id}`)
                        .setLabel('Tools')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔧'),
                    new ButtonBuilder()
                        .setCustomId(`inventory_weapons_${targetUser.id}`)
                        .setLabel('Weapons')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⚔️'),
                    new ButtonBuilder()
                        .setCustomId(`inventory_consumables_${targetUser.id}`)
                        .setLabel('Consumables')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🧪'),
                    new ButtonBuilder()
                        .setCustomId(`inventory_materials_${targetUser.id}`)
                        .setLabel('Materials')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔩')
                );

            return interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Error viewing inventory:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
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
                // Invalid user, use message author
            }
        }

        try {
            const result = await EconomyService.getUserInventory(targetUser.id, 'all');

            if (!result.success || !result.inventory || result.inventory.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.warn)
                    .setTitle('📦 Empty Inventory')
                    .setDescription(`${targetUser.id === message.author.id ? 'Your' : `${targetUser.displayName}'s`} inventory is empty.`)
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            const inventory = result.inventory;
            const totalValue = inventory.reduce((sum, item) => sum + (item.sellPrice || 0) * item.quantity, 0);
            const itemCount = inventory.reduce((sum, item) => sum + item.quantity, 0);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default)
                .setTitle(`📦 ${targetUser.displayName}'s Inventory`)
                .setDescription(`**${itemCount}** items • Total Value: **${totalValue.toLocaleString()}** coins`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            // Show top items
            const topItems = inventory
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 15)
                .map(item => {
                    const rarity = this.getRarityEmoji(item.rarity);
                    const value = item.sellPrice ? ` (${item.sellPrice.toLocaleString()} coins)` : '';
                    return `${rarity} **${item.quantity}x** ${item.name}${value}`;
                })
                .join('\n');

            embed.addFields({
                name: 'Items',
                value: topItems || 'None',
                inline: false
            });

            if (inventory.length > 15) {
                embed.setFooter({ text: `...and ${inventory.length - 15} more items. Use /inventory for full view.` });
            }

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error viewing inventory:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while fetching the inventory. Please try again.')
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }
    }

    private getRarityEmoji(rarity: string): string {
        switch (rarity?.toLowerCase()) {
            case 'legendary': return '🟠';
            case 'epic': return '🟣';
            case 'rare': return '🔵';
            case 'uncommon': return '🟢';
            case 'common': 
            default: return '⚪';
        }
    }

    private getCategoryEmoji(category: string): string {
        switch (category?.toLowerCase()) {
            case 'tools': return '🔧';
            case 'weapons': return '⚔️';
            case 'consumables': return '🧪';
            case 'materials': return '🔩';
            case 'collectibles': return '💎';
            default: return '📦';
        }
    }
}
