import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { EconomyModule } from '../../modules/Economy';
import { EmbedBuilder, MessageFlags, Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { EconomyService } from '../../lib/services/EconomyService';
import { EconomyItem } from '../../models/EconomyItem';
import config from '../../config';

@ApplyOptions<Command.Options>({
    name: 'shop',
    description: 'Browse and buy items from the shop'
})
export class ShopCommand extends ModuleCommand<EconomyModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Economy',
            description: 'Browse and buy items from the shop',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('shop')
                .setDescription('Browse and buy items from the shop')
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('list')
                        .setDescription('Browse available items')
                        .addStringOption((option) =>
                            option
                                .setName('category')
                                .setDescription('Filter by category')
                                .setRequired(false)
                                .addChoices(
                                    { name: 'Food', value: 'food' },
                                    { name: 'Tools', value: 'tools' },
                                    { name: 'Collectibles', value: 'collectibles' },
                                    { name: 'Weapons', value: 'weapons' },
                                    { name: 'Misc', value: 'misc' }
                                )
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('buy')
                        .setDescription('Purchase an item')
                        .addStringOption((option) =>
                            option
                                .setName('item')
                                .setDescription('Item to purchase')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('quantity')
                                .setDescription('Quantity to purchase')
                                .setRequired(false)
                                .setMinValue(1)
                                .setMaxValue(100)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('info')
                        .setDescription('Get detailed information about an item')
                        .addStringOption((option) =>
                            option
                                .setName('item')
                                .setDescription('Item to get info about')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
        );
    }

    public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
        const focusedOption = interaction.options.getFocused(true);
        
        if (focusedOption.name === 'item') {
            const input = focusedOption.value.toLowerCase();
            const items = await EconomyItem.find({ 
                'shop.available': true,
                name: { $regex: input, $options: 'i' }
            }).limit(25);
            
            return interaction.respond(
                items.map(item => ({
                    name: `${item.emoji} ${item.name} - ${item.basePrice} coins`,
                    value: item.itemId
                }))
            );
        }
        
        return interaction.respond([]);
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'list':
                return this.handleShopList(interaction);
            case 'buy':
                return this.handleShopBuy(interaction);
            case 'info':
                return this.handleItemInfo(interaction);
            default:
                return interaction.reply({
                    content: 'Invalid subcommand',
                    flags: MessageFlags.Ephemeral
                });
        }
    }

    private async handleShopList(interaction: Command.ChatInputCommandInteraction) {
        const category = interaction.options.getString('category');
        
        const filter: any = { 'shop.available': true };
        if (category) {
            filter.category = category;
        }

        const items = await EconomyItem.find(filter).limit(10);

        if (items.length === 0) {
            return interaction.reply({
                content: 'No items available in the shop' + (category ? ` for category: ${category}` : ''),
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default)
            .setTitle('🛒 Shop')
            .setDescription(category ? `Items in category: **${category}**` : 'Available items')
            .setTimestamp();

        for (const item of items) {
            const price = await EconomyService.getItemPrice(item.itemId, 'buy');
            const stockText = item.shop.stock === -1 ? 'Unlimited' : `${item.shop.stock} left`;
            
            embed.addFields({
                name: `${item.emoji} ${item.name}`,
                value: `**${price} coins** • ${item.rarity} • ${stockText}\n${item.description}`,
                inline: false
            });
        }

        return interaction.reply({ embeds: [embed] });
    }

    private async handleShopBuy(interaction: Command.ChatInputCommandInteraction) {
        const itemId = interaction.options.getString('item', true);
        const quantity = interaction.options.getInteger('quantity') || 1;

        const user = await EconomyService.getUser(interaction.user.id, interaction.user.username);
        const result = await EconomyService.purchaseItem(user.userId, itemId, quantity);

        const embed = new EmbedBuilder()
            .setColor(result.success ? config.bot.embedColor.success : config.bot.embedColor.err)
            .setTitle(result.success ? '✅ Purchase Successful' : '❌ Purchase Failed')
            .setDescription(result.message)
            .setTimestamp();

        if (result.cost) {
            embed.addFields({
                name: 'Cost',
                value: `${result.cost.toLocaleString()} coins`,
                inline: true
            });
        }

        return interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }

    private async handleItemInfo(interaction: Command.ChatInputCommandInteraction) {
        const itemId = interaction.options.getString('item', true);
        const item = await EconomyItem.findOne({ itemId });

        if (!item) {
            return interaction.reply({
                content: 'Item not found',
                flags: MessageFlags.Ephemeral
            });
        }

        const price = await EconomyService.getItemPrice(item.itemId, 'buy');
        const sellPrice = await EconomyService.getItemPrice(item.itemId, 'sell');

        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default)
            .setTitle(`${item.emoji} ${item.name}`)
            .setDescription(item.description)
            .addFields(
                {
                    name: '💰 Buy Price',
                    value: `${price.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '💸 Sell Price',
                    value: `${sellPrice.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '⭐ Rarity',
                    value: item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1),
                    inline: true
                },
                {
                    name: '📦 Category',
                    value: item.category.charAt(0).toUpperCase() + item.category.slice(1),
                    inline: true
                },
                {
                    name: '🔄 Tradeable',
                    value: item.tradeable ? 'Yes' : 'No',
                    inline: true
                },
                {
                    name: '💱 Sellable',
                    value: item.sellable ? 'Yes' : 'No',
                    inline: true
                }
            )
            .setTimestamp();

        if (item.shop.stock !== -1) {
            embed.addFields({
                name: '📊 Stock',
                value: `${item.shop.stock} remaining`,
                inline: true
            });
        }

        if (item.effects && item.effects.length > 0) {
            const effectsText = item.effects.map(effect => 
                `${effect.type}: ${effect.value}${effect.duration ? ` (${effect.duration}h)` : ''}`
            ).join('\n');
            
            embed.addFields({
                name: '✨ Effects',
                value: effectsText,
                inline: false
            });
        }

        return interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }

    public override async messageRun(message: Message) {
        const args = message.content.split(' ').slice(1);
        const subcommand = args[0] || 'list';

        switch (subcommand.toLowerCase()) {
            case 'list':
                return this.handleTextShopList(message, args.slice(1));
            case 'buy':
                return this.handleTextShopBuy(message, args.slice(1));
            case 'info':
                return this.handleTextItemInfo(message, args.slice(1));
            default:
                return message.reply('Usage: `shop list [category]`, `shop buy <item> [quantity]`, or `shop info <item>`');
        }
    }

    private async handleTextShopList(message: Message, args: string[]) {
        const category = args[0];
        
        const filter: any = { 'shop.available': true };
        if (category) {
            filter.category = category.toLowerCase();
        }

        const items = await EconomyItem.find(filter).limit(10);

        if (items.length === 0) {
            return message.reply('No items available in the shop' + (category ? ` for category: ${category}` : ''));
        }

        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default)
            .setTitle('🛒 Shop')
            .setDescription(category ? `Items in category: **${category}**` : 'Available items')
            .setTimestamp();

        for (const item of items) {
            const price = await EconomyService.getItemPrice(item.itemId, 'buy');
            const stockText = item.shop.stock === -1 ? 'Unlimited' : `${item.shop.stock} left`;
            
            embed.addFields({
                name: `${item.emoji} ${item.name}`,
                value: `**${price} coins** • ${item.rarity} • ${stockText}\n${item.description}`,
                inline: false
            });
        }

        return message.reply({ embeds: [embed] });
    }

    private async handleTextShopBuy(message: Message, args: string[]) {
        if (args.length === 0) {
            return message.reply('Please specify an item to buy. Usage: `shop buy <item> [quantity]`');
        }

        const itemName = args[0];
        const quantity = parseInt(args[1]) || 1;

        // Find item by name
        const item = await EconomyItem.findOne({ 
            name: { $regex: itemName, $options: 'i' },
            'shop.available': true
        });

        if (!item) {
            return message.reply(`Item "${itemName}" not found in shop.`);
        }

        const user = await EconomyService.getUser(message.author.id, message.author.username);
        const result = await EconomyService.purchaseItem(user.userId, item.itemId, quantity);

        const embed = new EmbedBuilder()
            .setColor(result.success ? config.bot.embedColor.success : config.bot.embedColor.err)
            .setTitle(result.success ? '✅ Purchase Successful' : '❌ Purchase Failed')
            .setDescription(result.message)
            .setTimestamp();

        if (result.cost) {
            embed.addFields({
                name: 'Cost',
                value: `${result.cost.toLocaleString()} coins`,
                inline: true
            });
        }

        return message.reply({ embeds: [embed] });
    }

    private async handleTextItemInfo(message: Message, args: string[]) {
        if (args.length === 0) {
            return message.reply('Please specify an item to get info about. Usage: `shop info <item>`');
        }

        const itemName = args.join(' ');
        const item = await EconomyItem.findOne({ 
            name: { $regex: itemName, $options: 'i' }
        });

        if (!item) {
            return message.reply(`Item "${itemName}" not found.`);
        }

        const price = await EconomyService.getItemPrice(item.itemId, 'buy');
        const sellPrice = await EconomyService.getItemPrice(item.itemId, 'sell');

        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default)
            .setTitle(`${item.emoji} ${item.name}`)
            .setDescription(item.description)
            .addFields(
                {
                    name: '💰 Buy Price',
                    value: `${price.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '💸 Sell Price',
                    value: `${sellPrice.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '⭐ Rarity',
                    value: item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1),
                    inline: true
                }
            )
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
}
