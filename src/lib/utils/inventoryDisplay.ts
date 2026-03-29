import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} from 'discord.js';
import type { EconomyItem } from '../../models/User';

export type InventoryDisplayItem = EconomyItem & { sellPrice?: number };

type PriceDisplayOptions = {
    includeEachSuffix: boolean;
    showNoValue: boolean;
};

const defaultPriceDisplay: PriceDisplayOptions = {
    includeEachSuffix: true,
    showNoValue: true
};

export function getRarityEmoji(rarity: string): string {
    switch (rarity?.toLowerCase()) {
        case 'common':
            return '⚪';
        case 'uncommon':
            return '🟢';
        case 'rare':
            return '🔵';
        case 'epic':
            return '🟣';
        case 'legendary':
            return '🟡';
        case 'mythical':
            return '🔴';
        case 'divine':
            return '✨';
        case 'cursed':
            return '💀';
        default:
            return '⚪';
    }
}

export function getCategoryEmoji(category: string): string {
    switch (category?.toLowerCase()) {
        case 'tools':
            return '🔧';
        case 'weapons':
            return '⚔️';
        case 'armor':
            return '🛡️';
        case 'consumables':
            return '🧪';
        case 'materials':
            return '🔩';
        case 'collectibles':
            return '💎';
        case 'food':
            return '🍎';
        case 'drinks':
            return '🥤';
        case 'scrolls':
            return '📜';
        case 'books':
            return '📚';
        case 'potions':
            return '🧪';
        case 'gems':
            return '💎';
        case 'currencies':
            return '💰';
        default:
            return '📦';
    }
}

export function getCategoryDisplayName(category: string): string {
    switch (category.toLowerCase()) {
        case 'all':
            return 'All Items';
        case 'tools':
            return 'Tools';
        case 'weapons':
            return 'Weapons';
        case 'consumables':
            return 'Consumables';
        case 'materials':
            return 'Materials';
        case 'collectibles':
            return 'Collectibles';
        default:
            return `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
    }
}

export function calculateInventoryStats(items: InventoryDisplayItem[]): { itemCount: number; totalValue: number } {
    return items.reduce(
        (summary, item) => {
            const sellPrice = toSafeNumber(item.sellPrice);
            const quantity = toSafeNumber(item.quantity);

            summary.itemCount += quantity;
            summary.totalValue += sellPrice * quantity;
            return summary;
        },
        { itemCount: 0, totalValue: 0 }
    );
}

export function groupInventoryByCategory(items: InventoryDisplayItem[]): Map<string, InventoryDisplayItem[]> {
    const grouped = new Map<string, InventoryDisplayItem[]>();

    for (const item of items) {
        const category = item.category || 'misc';
        const categoryItems = grouped.get(category);

        if (categoryItems) {
            categoryItems.push(item);
            continue;
        }

        grouped.set(category, [item]);
    }

    return grouped;
}

export function addGroupedInventoryFields(
    embed: EmbedBuilder,
    groupedItems: Map<string, InventoryDisplayItem[]>,
    maxItemsPerCategory: number,
    priceDisplayOptions: Partial<PriceDisplayOptions> = {}
): void {
    for (const [category, items] of groupedItems) {
        if (items.length === 0) {
            continue;
        }

        const itemList = formatInventoryItems(items, maxItemsPerCategory, priceDisplayOptions);
        const moreItems = items.length > maxItemsPerCategory ? `\n*...and ${items.length - maxItemsPerCategory} more*` : '';

        embed.addFields({
            name: `${getCategoryEmoji(category)} ${toTitleCase(category)} (${items.length})`,
            value: itemList + moreItems || 'No items',
            inline: false
        });
    }
}

export function addSingleCategoryField(
    embed: EmbedBuilder,
    category: string,
    items: InventoryDisplayItem[],
    maxItems: number,
    priceDisplayOptions: Partial<PriceDisplayOptions> = {}
): void {
    if (items.length === 0) {
        embed.addFields({
            name: `${getCategoryEmoji(category)} Items in this category`,
            value: 'No items found in this category.',
            inline: false
        });
        return;
    }

    const itemList = formatInventoryItems(items, maxItems, priceDisplayOptions);
    const moreItems = items.length > maxItems ? `\n*...and ${items.length - maxItems} more*` : '';

    embed.addFields({
        name: `${getCategoryEmoji(category)} Items in this category`,
        value: itemList + moreItems || 'No items',
        inline: false
    });
}

export function buildInventoryFilterButtonRows(
    userId: string,
    expirationTime: number,
    mode: 'active' | 'expired'
): [ActionRowBuilder<ButtonBuilder>, ActionRowBuilder<ButtonBuilder>] {
    if (mode === 'expired') {
        const disabledRow1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            createInventoryButton('tools', 'Tools', '🔧', ButtonStyle.Secondary, true),
            createInventoryButton('weapons', 'Weapons', '⚔️', ButtonStyle.Secondary, true),
            createInventoryButton('consumables', 'Consumables', '🧪', ButtonStyle.Secondary, true),
            createInventoryButton('materials', 'Materials', '🔩', ButtonStyle.Secondary, true)
        );

        const disabledRow2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            createInventoryButton('collectibles', 'Collectibles', '💎', ButtonStyle.Secondary, true),
            createInventoryButton('all', 'All Items', '📦', ButtonStyle.Primary, true),
            createInventoryButton('refresh', 'Expired', '⏰', ButtonStyle.Danger, true)
        );

        return [disabledRow1, disabledRow2];
    }

    const activeRow1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        createInventoryButton(`tools_${userId}_${expirationTime}`, 'Tools', '🔧', ButtonStyle.Secondary, false),
        createInventoryButton(`weapons_${userId}_${expirationTime}`, 'Weapons', '⚔️', ButtonStyle.Secondary, false),
        createInventoryButton(`consumables_${userId}_${expirationTime}`, 'Consumables', '🧪', ButtonStyle.Secondary, false),
        createInventoryButton(`materials_${userId}_${expirationTime}`, 'Materials', '🔩', ButtonStyle.Secondary, false)
    );

    const activeRow2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        createInventoryButton(`collectibles_${userId}_${expirationTime}`, 'Collectibles', '💎', ButtonStyle.Secondary, false),
        createInventoryButton(`all_${userId}_${expirationTime}`, 'All Items', '📦', ButtonStyle.Primary, false),
        createInventoryButton(`refresh_${userId}_${expirationTime}`, 'Refresh', '🔄', ButtonStyle.Success, false)
    );

    return [activeRow1, activeRow2];
}

function formatInventoryItems(
    items: InventoryDisplayItem[],
    maxItems: number,
    options: Partial<PriceDisplayOptions>
): string {
    const mergedOptions: PriceDisplayOptions = {
        ...defaultPriceDisplay,
        ...options
    };

    return items
        .slice(0, maxItems)
        .map((item) => formatInventoryItem(item, mergedOptions))
        .join('\n');
}

function formatInventoryItem(item: InventoryDisplayItem, options: PriceDisplayOptions): string {
    const rarity = getRarityEmoji(item.rarity);
    const sellPrice = toSafeNumber(item.sellPrice);
    const quantity = toSafeNumber(item.quantity);
    const sellable = item.sellable !== false;

    let priceText = '';
    if (sellable && sellPrice > 0) {
        const suffix = options.includeEachSuffix ? ' each' : '';
        priceText = `(${sellPrice.toLocaleString()}c${suffix})`;
    } else if (!sellable) {
        priceText = '(Not Sellable)';
    } else if (options.showNoValue) {
        priceText = '(No Value)';
    }

    return `${rarity} **${quantity.toLocaleString()}x** ${item.name || 'Unknown Item'} ${priceText}`.trim();
}

function createInventoryButton(
    customSuffix: string,
    label: string,
    emoji: string,
    style: ButtonStyle,
    disabled: boolean
): ButtonBuilder {
    const customId = disabled ? `expired_${customSuffix}` : `inventory_${customSuffix}`;

    return new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(style)
        .setEmoji(emoji)
        .setDisabled(disabled);
}

function toSafeNumber(value: unknown): number {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
}

function toTitleCase(value: string): string {
    if (!value) {
        return 'Unknown';
    }

    return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
