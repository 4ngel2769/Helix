import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { EconomyModule } from '../../modules/Economy';
import { EmbedBuilder, MessageFlags, Message } from 'discord.js';
import config from '../../config';
import { EconomyService } from '../../lib/services/EconomyService';
import { EffectService } from '../../lib/services/EffectService';
import { EconomyItem } from '../../models/EconomyItem';

interface UseItemResult {
    success: boolean;
    message: string;
    appliedEffects?: string[];
    statChanges?: Record<string, number>;
}

@ApplyOptions<Command.Options>({
    name: 'use',
    description: 'Use an item from your inventory',
    aliases: ['consume', 'activate']
})
export class UseCommand extends ModuleCommand<EconomyModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Economy',
            description: 'Use an item from your inventory',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('use')
                .setDescription('Use an item from your inventory')
                .addStringOption((option) =>
                    option
                        .setName('item')
                        .setDescription('Item to use')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName('quantity')
                        .setDescription('Quantity to use (default: 1)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(100)
                )
        );
    }

    public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
        const focusedOption = interaction.options.getFocused(true);
        
        if (focusedOption.name === 'item') {
            try {
                const inventory = await EconomyService.getInventory(interaction.user.id);
                if (inventory.length === 0) {
                    return interaction.respond([]);
                }

                const itemIds = [...new Set(inventory.map((item) => item.itemId))];
                const itemRecords = await EconomyItem.find(
                    { itemId: { $in: itemIds } },
                    { itemId: 1, consumable: 1, effects: 1 }
                ).lean();

                const usableItemIds = new Set(
                    itemRecords
                        .filter((item) => item.consumable || (Array.isArray(item.effects) && item.effects.length > 0))
                        .map((item) => item.itemId)
                );
                
                const searchValue = focusedOption.value.toLowerCase();
                const usableItems = inventory.filter(
                    (invItem) =>
                        usableItemIds.has(invItem.itemId) &&
                        invItem.name.toLowerCase().includes(searchValue)
                );

                const choices = usableItems
                    .slice(0, 25)
                    .map(item => ({
                        name: `${item.name} (${item.quantity}x)`,
                        value: item.name
                    }));

                return interaction.respond(choices);
            } catch (error) {
                return interaction.respond([]);
            }
        }
        
        return interaction.respond([]);
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const itemName = interaction.options.getString('item', true);
        const quantity = interaction.options.getInteger('quantity') || 1;

        try {
            const result = await this.useItem(interaction.user.id, itemName, quantity);

            const embed = new EmbedBuilder()
                .setColor(result.success ? config.bot.embedColor.success : config.bot.embedColor.err)
                .setTitle(result.success ? '✨ Item Used' : '❌ Failed to Use Item')
                .setDescription(result.message)
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp();

            if (result.success && result.appliedEffects && result.appliedEffects.length > 0) {
                embed.addFields({
                    name: 'Effects Applied',
                    value: result.appliedEffects.join('\n'),
                    inline: false
                });
            }

            if (result.statChanges) {
                const statText = Object.entries(result.statChanges)
                    .map(([stat, change]) => `${stat}: ${(change as number) >= 0 ? '+' : ''}${change}`)
                    .join('\n');
                
                if (statText) {
                    embed.addFields({
                        name: 'Stat Changes',
                        value: statText,
                        inline: true
                    });
                }
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in use command:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while using the item. Please try again.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    public override async messageRun(message: Message) {
        const args = message.content.split(' ').slice(1);
        
        if (args.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Invalid Usage')
                .setDescription('Please specify an item to use.\n\nUsage: `use <item> [quantity]`')
                .addFields({
                    name: 'Examples',
                    value: '`use healing potion`\n`use apple 3`\n`use scroll of wisdom`',
                    inline: false
                })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        const itemName = args.slice(0, -1).join(' ') || args[0];
        const quantityArg = args.length > 1 ? args[args.length - 1] : '1';
        const quantity = parseInt(quantityArg) || 1;

        if (quantity < 1) {
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Invalid Quantity')
                .setDescription('Please specify a valid quantity (1 or higher).')
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        try {
            const result = await this.useItem(message.author.id, itemName, quantity);

            const embed = new EmbedBuilder()
                .setColor(result.success ? config.bot.embedColor.success : config.bot.embedColor.err)
                .setTitle(result.success ? '✨ Item Used' : '❌ Failed to Use Item')
                .setDescription(result.message)
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp();

            if (result.success && result.appliedEffects && result.appliedEffects.length > 0) {
                embed.addFields({
                    name: 'Effects Applied',
                    value: result.appliedEffects.join('\n'),
                    inline: false
                });
            }

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in use command:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while using the item. Please try again.')
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }
    }

    private async useItem(userId: string, itemName: string, quantity: number): Promise<UseItemResult> {
        try {
            const inventory = await EconomyService.getInventory(userId);
            const userItem = inventory.find(item => 
                item.name.toLowerCase().includes(itemName.toLowerCase())
            );

            if (!userItem) {
                return { success: false, message: 'You don\'t have this item in your inventory.' };
            }

            if (userItem.quantity < quantity) {
                return { success: false, message: `You only have ${userItem.quantity}x ${userItem.name}.` };
            }

            const item = await EconomyItem.findOne({ itemId: userItem.itemId });
            if (!item) {
                return { success: false, message: 'Item data not found.' };
            }

            const isUsable = this.checkItemUsability(item);
            if (!isUsable.canUse) {
                return { success: false, message: isUsable.reason };
            }

            const { totalEffects, totalStatChanges } = await this.applyEffectsForQuantity(userId, item.itemId, quantity);

            if (item.consumable && !(await EconomyService.removeItem(userId, item.itemId, quantity))) {
                return { success: false, message: 'Failed to remove item from inventory.' };
            }

            return {
                success: true,
                message: `Used ${quantity}x ${item.emoji} ${item.name}${item.consumable ? ' (consumed)' : ''}`,
                appliedEffects: totalEffects,
                statChanges: totalStatChanges
            };

        } catch (error) {
            console.error('Error using item:', error);
            return { success: false, message: 'Failed to use item.' };
        }
    }

    private async applyEffectsForQuantity(
        userId: string,
        itemId: string,
        quantity: number
    ): Promise<{ totalEffects: string[]; totalStatChanges: Record<string, number> }> {
        const totalEffects: string[] = [];
        const totalStatChanges: Record<string, number> = {};

        for (let i = 0; i < quantity; i++) {
            const result = await EffectService.applyItemEffects(userId, itemId, 'use');
            if (!result.success) {
                continue;
            }

            if (result.appliedEffects?.length) {
                totalEffects.push(...result.appliedEffects);
            }

            if (result.statChanges) {
                this.mergeStatChanges(totalStatChanges, result.statChanges);
            }
        }

        return { totalEffects, totalStatChanges };
    }

    private mergeStatChanges(target: Record<string, number>, source: Record<string, number>): void {
        for (const [stat, change] of Object.entries(source)) {
            target[stat] = (target[stat] || 0) + change;
        }
    }

    private checkItemUsability(item: any): { canUse: boolean; reason: string } {
        // Check if item is consumable
        if (item.consumable) {
            return { canUse: true, reason: '' };
        }

        // Check if item has effects
        if (item.effects && item.effects.length > 0) {
            return { canUse: true, reason: '' };
        }

        // Check specific categories that might be usable
        const usableCategories = ['potions', 'consumables', 'food', 'drinks', 'scrolls'];
        if (usableCategories.includes(item.category)) {
            return { canUse: true, reason: '' };
        }

        // Item is not usable
        const suggestions = [];
        if (item.equipable) {
            suggestions.push('try equipping it instead');
        }
        if (item.sellable) {
            suggestions.push('sell it for coins');
        }
        if (item.tradeable) {
            suggestions.push('trade it with other users');
        }

        let reason = `This item cannot be used. It's a ${item.category} item`;
        if (suggestions.length > 0) {
            reason += ` - you can ${suggestions.join(' or ')}.`;
        } else {
            reason += '.';
        }

        return { canUse: false, reason };
    }
}
