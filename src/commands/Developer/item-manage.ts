import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { EconomyItem } from '../../models/EconomyItem';
import { randomUUID } from 'crypto';
import config from '../../config';

@ApplyOptions<Command.Options>({
    name: 'item-manage',
    description: 'Manage economy items (Developer Only)',
    aliases: ['itemmanage', 'manageitems'],
    preconditions: ['OwnerOnly']
})
export class ItemManageCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('create')
                        .setDescription('Create a new economy item')
                        .addStringOption((option) =>
                            option
                                .setName('name')
                                .setDescription('Item name')
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('description')
                                .setDescription('Item description')
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('category')
                                .setDescription('Item category')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Tools', value: 'tools' },
                                    { name: 'Weapons', value: 'weapons' },
                                    { name: 'Consumables', value: 'consumables' },
                                    { name: 'Materials', value: 'materials' },
                                    { name: 'Collectibles', value: 'collectibles' },
                                    { name: 'Misc', value: 'misc' }
                                )
                        )
                        .addStringOption((option) =>
                            option
                                .setName('rarity')
                                .setDescription('Item rarity')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Common', value: 'common' },
                                    { name: 'Uncommon', value: 'uncommon' },
                                    { name: 'Rare', value: 'rare' },
                                    { name: 'Epic', value: 'epic' },
                                    { name: 'Legendary', value: 'legendary' },
                                    { name: 'Mythical', value: 'mythical' }
                                )
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('price')
                                .setDescription('Base price of the item')
                                .setRequired(true)
                                .setMinValue(1)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('emoji')
                                .setDescription('Item emoji/icon')
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('image')
                                .setDescription('Item image URL')
                                .setRequired(false)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('effects')
                                .setDescription('Item effects (JSON format: [{"type":"heal","value":50}])')
                                .setRequired(false)
                        )
                        .addBooleanOption((option) =>
                            option
                                .setName('tradeable')
                                .setDescription('Can this item be traded?')
                                .setRequired(false)
                        )
                        .addBooleanOption((option) =>
                            option
                                .setName('sellable')
                                .setDescription('Can this item be sold?')
                                .setRequired(false)
                        )
                        .addBooleanOption((option) =>
                            option
                                .setName('shop-available')
                                .setDescription('Is this item available in the shop?')
                                .setRequired(false)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('shop-stock')
                                .setDescription('Shop stock (-1 for unlimited)')
                                .setRequired(false)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('list')
                        .setDescription('List all economy items')
                        .addStringOption((option) =>
                            option
                                .setName('category')
                                .setDescription('Filter by category')
                                .setRequired(false)
                                .addChoices(
                                    { name: 'All', value: 'all' },
                                    { name: 'Tools', value: 'tools' },
                                    { name: 'Weapons', value: 'weapons' },
                                    { name: 'Consumables', value: 'consumables' },
                                    { name: 'Materials', value: 'materials' },
                                    { name: 'Collectibles', value: 'collectibles' },
                                    { name: 'Misc', value: 'misc' }
                                )
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('edit')
                        .setDescription('Edit an existing item')
                        .addStringOption((option) =>
                            option
                                .setName('item-id')
                                .setDescription('Item ID to edit')
                                .setRequired(true)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('delete')
                        .setDescription('Delete an item')
                        .addStringOption((option) =>
                            option
                                .setName('item-id')
                                .setDescription('Item ID to delete')
                                .setRequired(true)
                        )
                ),
            {
                idHints: ['1234567890123456789']
            }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                return this.handleCreate(interaction);
            case 'list':
                return this.handleList(interaction);
            case 'edit':
                return this.handleEdit(interaction);
            case 'delete':
                return this.handleDelete(interaction);
            default:
                return interaction.reply({ content: 'Invalid subcommand', ephemeral: true });
        }
    }

    private async handleCreate(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const name = interaction.options.getString('name', true);
        const description = interaction.options.getString('description', true);
        const category = interaction.options.getString('category', true);
        const rarity = interaction.options.getString('rarity', true) as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical';
        const basePrice = interaction.options.getInteger('price', true);
        const emoji = interaction.options.getString('emoji') || '📦';
        const image = interaction.options.getString('image');
        const effectsString = interaction.options.getString('effects');
        const tradeable = interaction.options.getBoolean('tradeable') ?? true;
        const sellable = interaction.options.getBoolean('sellable') ?? true;
        const shopAvailable = interaction.options.getBoolean('shop-available') ?? false;
        const shopStock = interaction.options.getInteger('shop-stock') ?? -1;

        try {
            // Parse effects if provided
            let effects: any[] = [];
            if (effectsString) {
                try {
                    effects = JSON.parse(effectsString);
                    if (!Array.isArray(effects)) {
                        throw new Error('Effects must be an array');
                    }
                    
                    // Validate effect structure
                    for (const effect of effects) {
                        if (!effect.type || typeof effect.value !== 'number') {
                            throw new Error('Each effect must have type and value properties');
                        }
                    }
                } catch (error) {
                    const embed = new EmbedBuilder()
                        .setColor(config.bot.embedColor.err)
                        .setTitle('❌ Invalid Effects Format')
                        .setDescription('Effects must be valid JSON array format.\n\n**Examples:**\n```json\n[{"type":"heal","value":50}]\n[{"type":"strength","value":5,"duration":300}]\n[{"type":"poison","value":10,"duration":60,"chance":75}]\n```\n\n**Available Effect Types:**\n`heal`, `harm`, `sanity`, `energy`, `luck`, `experience`, `money`, `protection`, `speed`, `strength`, `intelligence`, `charisma`, `stealth`, `regeneration`, `poison`, `burn`, `freeze`, `shock`, `confusion`, `fear`, `rage`, `calm`, `focus`, `blind`, `deaf`, `mute`, `paralysis`, `sleep`, `charm`')
                        .setFooter({ text: 'Developer Commands • Item Management' })
                        .setTimestamp();

                    return interaction.editReply({ embeds: [embed] });
                }
            }

            // Set item properties based on category
            const categoryDefaults = this.getCategoryDefaults(category);

            // Check if item with same name exists
            const existingItem = await EconomyItem.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
            if (existingItem) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err)
                    .setTitle('❌ Item Creation Failed')
                    .setDescription(`An item with the name "${name}" already exists.`)
                    .setFooter({ text: 'Developer Commands • Item Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const itemId = randomUUID();
            const newItem = new EconomyItem({
                itemId,
                name,
                description,
                category,
                rarity,
                basePrice,
                emoji,
                image,
                effects,
                tradeable,
                sellable,
                consumable: categoryDefaults.consumable,
                stackable: categoryDefaults.stackable,
                maxStack: categoryDefaults.maxStack,
                equipable: categoryDefaults.equipable,
                equipSlot: categoryDefaults.equipSlot,
                shop: {
                    available: shopAvailable,
                    stock: shopStock,
                    category: category
                },
                metadata: {
                    createdBy: interaction.user.id,
                    createdAt: new Date()
                }
            });

            await newItem.save();

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success)
                .setTitle('✅ Item Created Successfully')
                .setDescription(`**${emoji} ${name}** has been created!`)
                .addFields(
                    { name: 'Item ID', value: `\`${itemId}\``, inline: true },
                    { name: 'Category', value: category, inline: true },
                    { name: 'Rarity', value: this.getRarityDisplay(rarity), inline: true },
                    { name: 'Base Price', value: `${basePrice.toLocaleString()} coins`, inline: true },
                    { name: 'Properties', value: `Tradeable: ${tradeable ? 'Yes' : 'No'}\nSellable: ${sellable ? 'Yes' : 'No'}\nConsumable: ${categoryDefaults.consumable ? 'Yes' : 'No'}\nEquipable: ${categoryDefaults.equipable ? 'Yes' : 'No'}`, inline: true },
                    { name: 'Shop Status', value: `Available: ${shopAvailable ? 'Yes' : 'No'}\nStock: ${shopStock === -1 ? 'Unlimited' : shopStock.toString()}`, inline: true },
                    { name: 'Description', value: description, inline: false }
                )
                .setFooter({ text: 'Developer Commands • Item Management' })
                .setTimestamp();

            if (effects.length > 0) {
                const effectsText = effects.map(effect => {
                    let text = `**${effect.type}**: ${effect.value > 0 ? '+' : ''}${effect.value}`;
                    if (effect.duration) text += ` (${effect.duration}s)`;
                    if (effect.chance && effect.chance < 100) text += ` (${effect.chance}% chance)`;
                    return text;
                }).join('\n');
                
                embed.addFields({ name: 'Effects', value: effectsText, inline: false });
            }

            if (image) {
                embed.setThumbnail(image);
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error creating item:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while creating the item.')
                .setFooter({ text: 'Developer Commands • Item Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private getCategoryDefaults(category: string) {
        const defaults = {
            weapons: { consumable: false, stackable: false, maxStack: 1, equipable: true, equipSlot: 'weapon' },
            armor: { consumable: false, stackable: false, maxStack: 1, equipable: true, equipSlot: 'chest' },
            tools: { consumable: false, stackable: false, maxStack: 1, equipable: false, equipSlot: undefined },
            consumables: { consumable: true, stackable: true, maxStack: 100, equipable: false, equipSlot: undefined },
            food: { consumable: true, stackable: true, maxStack: 100, equipable: false, equipSlot: undefined },
            drinks: { consumable: true, stackable: true, maxStack: 100, equipable: false, equipSlot: undefined },
            potions: { consumable: true, stackable: true, maxStack: 50, equipable: false, equipSlot: undefined },
            scrolls: { consumable: true, stackable: true, maxStack: 25, equipable: false, equipSlot: undefined },
            books: { consumable: false, stackable: true, maxStack: 10, equipable: false, equipSlot: undefined },
            gems: { consumable: false, stackable: true, maxStack: 1000, equipable: false, equipSlot: undefined },
            artifacts: { consumable: false, stackable: false, maxStack: 1, equipable: true, equipSlot: 'accessory' },
            materials: { consumable: false, stackable: true, maxStack: 1000, equipable: false, equipSlot: undefined },
            collectibles: { consumable: false, stackable: true, maxStack: 100, equipable: false, equipSlot: undefined },
            currencies: { consumable: false, stackable: true, maxStack: 10000, equipable: false, equipSlot: undefined },
            containers: { consumable: false, stackable: false, maxStack: 1, equipable: false, equipSlot: undefined },
            furniture: { consumable: false, stackable: false, maxStack: 1, equipable: false, equipSlot: undefined },
            vehicles: { consumable: false, stackable: false, maxStack: 1, equipable: false, equipSlot: undefined },
            pets: { consumable: false, stackable: false, maxStack: 1, equipable: false, equipSlot: undefined },
            seeds: { consumable: false, stackable: true, maxStack: 100, equipable: false, equipSlot: undefined },
            crops: { consumable: true, stackable: true, maxStack: 100, equipable: false, equipSlot: undefined },
            misc: { consumable: false, stackable: true, maxStack: 100, equipable: false, equipSlot: undefined }
        };

        return defaults[category as keyof typeof defaults] || defaults.misc;
    }

    private async handleList(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const category = interaction.options.getString('category') || 'all';

        try {
            let query: any = {};
            if (category !== 'all') {
                query.category = category;
            }

            const items = await EconomyItem.find(query).sort({ name: 1 });

            if (items.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.warn)
                    .setTitle('📦 No Items Found')
                    .setDescription(`No items found${category !== 'all' ? ` in category: ${category}` : ''}.`)
                    .setFooter({ text: 'Developer Commands • Item Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default)
                .setTitle(`🔧 Economy Items${category !== 'all' ? ` - ${category}` : ''}`)
                .setDescription(`Found **${items.length}** items • Developer View`)
                .setFooter({ text: 'Developer Commands • Item Management' })
                .setTimestamp();

            // Group items by category for display
            const categorizedItems = new Map<string, any[]>();
            
            for (const item of items) {
                const cat = item.category || 'misc';
                if (!categorizedItems.has(cat)) {
                    categorizedItems.set(cat, []);
                }
                categorizedItems.get(cat)!.push(item);
            }

            for (const [cat, catItems] of categorizedItems) {
                const itemList = catItems
                    .slice(0, 10) // Show max 10 items per category
                    .map(item => {
                        const rarity = this.getRarityEmoji(item.rarity);
                        const shopStatus = item.shop.available ? '🏪' : '';
                        return `${rarity} ${item.emoji} **${item.name}** ${shopStatus}\n\`ID: ${item.itemId}\` • ${item.basePrice.toLocaleString()} coins`;
                    })
                    .join('\n\n');

                const hiddenCount = catItems.length > 10 ? catItems.length - 10 : 0;
                const fieldValue = itemList + (hiddenCount > 0 ? `\n\n*...and ${hiddenCount} more*` : '');

                embed.addFields({
                    name: `${this.getCategoryEmoji(cat)} ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${catItems.length})`,
                    value: fieldValue || 'None',
                    inline: false
                });
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error listing items:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while listing items.')
                .setFooter({ text: 'Developer Commands • Item Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private async handleEdit(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const itemId = interaction.options.getString('item-id', true);

        try {
            const item = await EconomyItem.findOne({ itemId });

            if (!item) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err)
                    .setTitle('❌ Item Not Found')
                    .setDescription(`No item found with ID: \`${itemId}\``)
                    .setFooter({ text: 'Developer Commands • Item Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            // Create edit menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`item_edit_${itemId}`)
                .setPlaceholder('Select a property to edit')
                .addOptions([
                    { label: 'Name', value: 'name', description: `Current: ${item.name}` },
                    { label: 'Description', value: 'description', description: 'Edit item description' },
                    { label: 'Category', value: 'category', description: `Current: ${item.category}` },
                    { label: 'Rarity', value: 'rarity', description: `Current: ${item.rarity}` },
                    { label: 'Base Price', value: 'price', description: `Current: ${item.basePrice} coins` },
                    { label: 'Emoji', value: 'emoji', description: `Current: ${item.emoji}` },
                    { label: 'Image URL', value: 'image', description: 'Edit item image' },
                    { label: 'Shop Settings', value: 'shop', description: 'Edit shop availability and stock' },
                    { label: 'Permissions', value: 'permissions', description: 'Edit tradeable/sellable' }
                ]);

            const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default)
                .setTitle(`🛠️ Edit Item: ${item.name}`)
                .setDescription('Select a property to edit from the dropdown below.')
                .addFields(
                    { name: 'Current Details', value: `**ID:** \`${item.itemId}\`\n**Name:** ${item.emoji} ${item.name}\n**Category:** ${item.category}\n**Rarity:** ${this.getRarityDisplay(item.rarity)}\n**Price:** ${item.basePrice.toLocaleString()} coins`, inline: false }
                )
                .setFooter({ text: 'Developer Commands • Item Management' })
                .setTimestamp();

            if (item.image) {
                embed.setThumbnail(item.image);
            }

            return interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Error editing item:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while preparing item for editing.')
                .setFooter({ text: 'Developer Commands • Item Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private async handleDelete(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const itemId = interaction.options.getString('item-id', true);

        try {
            const item = await EconomyItem.findOne({ itemId });

            if (!item) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err)
                    .setTitle('❌ Item Not Found')
                    .setDescription(`No item found with ID: \`${itemId}\``)
                    .setFooter({ text: 'Developer Commands • Item Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            await EconomyItem.deleteOne({ itemId });

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success)
                .setTitle('🗑️ Item Deleted')
                .setDescription(`**${item.emoji} ${item.name}** has been deleted successfully.`)
                .addFields(
                    { name: 'Deleted Item Details', value: `**ID:** \`${itemId}\`\n**Category:** ${item.category}\n**Rarity:** ${this.getRarityDisplay(item.rarity)}`, inline: false }
                )
                .setFooter({ text: 'Developer Commands • Item Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error deleting item:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while deleting the item.')
                .setFooter({ text: 'Developer Commands • Item Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private getRarityDisplay(rarity: string): string {
        const rarityColors = {
            common: '⚪ Common',
            uncommon: '🟢 Uncommon',
            rare: '🔵 Rare',
            epic: '🟣 Epic',
            legendary: '🟡 Legendary',
            mythical: '🔴 Mythical'
        };
        return rarityColors[rarity as keyof typeof rarityColors] || rarity;
    }

    private getRarityEmoji(rarity: string): string {
        const rarityEmojis = {
            common: '⚪',
            uncommon: '🟢',
            rare: '🔵',
            epic: '🟣',
            legendary: '🟡',
            mythical: '🔴'
        };
        return rarityEmojis[rarity as keyof typeof rarityEmojis] || '⚪';
    }

    private getCategoryEmoji(category: string): string {
        const categoryEmojis = {
            tools: '🔧',
            weapons: '⚔️',
            consumables: '🧪',
            materials: '🔩',
            collectibles: '💎',
            misc: '📦'
        };
        return categoryEmojis[category as keyof typeof categoryEmojis] || '📦';
    }
}
