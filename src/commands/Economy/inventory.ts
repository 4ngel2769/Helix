import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { EconomyModule } from '../../modules/Economy';
import { EmbedBuilder, Message, ColorResolvable } from 'discord.js';
import config from '../../config';
import { EconomyService } from '../../lib/services/EconomyService';
import {
    addGroupedInventoryFields,
    buildInventoryFilterButtonRows,
    calculateInventoryStats,
    groupInventoryByCategory,
    type InventoryDisplayItem
} from '../../lib/utils/inventoryDisplay';

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

            const inventory = result.inventory as InventoryDisplayItem[];
            const { totalValue, itemCount } = calculateInventoryStats(inventory);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle(`📦 ${targetUser.displayName}'s Inventory`)
                .setDescription(`**${itemCount.toLocaleString()}** items • Total Value: **${totalValue.toLocaleString()}** coins`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            addGroupedInventoryFields(embed, groupInventoryByCategory(inventory), 10, {
                includeEachSuffix: true,
                showNoValue: true
            });

            // Create filter buttons with expiration timestamp
            const expirationTime = Date.now() + 300000; // 5 minutes
            const [row, row2] = buildInventoryFilterButtonRows(targetUser.id, expirationTime, 'active');

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

            const inventory = result.inventory as InventoryDisplayItem[];
            const { totalValue, itemCount } = calculateInventoryStats(inventory);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle(`📦 ${targetUser.displayName}'s Inventory`)
                .setDescription(`**${itemCount.toLocaleString()}** items • Total Value: **${totalValue.toLocaleString()}** coins`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            addGroupedInventoryFields(embed, groupInventoryByCategory(inventory), 5, {
                includeEachSuffix: false,
                showNoValue: false
            });

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

}
