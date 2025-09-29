import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { EconomyModule } from '../../modules/Economy';
import { EmbedBuilder, MessageFlags, Message } from 'discord.js';
import config from '../../config';
import { EconomyService } from '../../lib/services/EconomyService';

@ApplyOptions<Command.Options>({
    name: 'sell',
    description: 'Sell items from your inventory',
    aliases: ['s']
})
export class SellCommand extends ModuleCommand<EconomyModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Economy',
            description: 'Sell items from your inventory',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('sell')
                .setDescription('Sell items from your inventory')
                .addStringOption((option) =>
                    option
                        .setName('item')
                        .setDescription('Item to sell')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName('quantity')
                        .setDescription('Quantity to sell (default: 1)')
                        .setRequired(false)
                        .setMinValue(1)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const itemName = interaction.options.getString('item', true);
        const quantity = interaction.options.getInteger('quantity') || 1;

        try {
            const result = await EconomyService.sellItem(interaction.user.id, itemName, quantity);

            if (!result.success) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err)
                    .setTitle('❌ Sell Failed')
                    .setDescription(result.message)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success)
                .setTitle('💰 Item Sold!')
                .setDescription(`Successfully sold **${quantity}x ${result.item!.name}**`)
                .addFields(
                    {
                        name: 'Sale Price',
                        value: `💸 **${result.totalValue!.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: 'New Balance',
                        value: `💎 **${result.newBalance!.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: 'Remaining Quantity',
                        value: `📦 **${result.remainingQuantity!}**`,
                        inline: true
                    }
                )
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in sell command:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing your sale. Please try again.')
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
                .setDescription('Please specify an item to sell.\n\nUsage: `sell <item> [quantity]`')
                .addFields(
                    {
                        name: 'Examples',
                        value: '`sell apple`\n`sell sword 2`\n`sell potion 5`',
                        inline: false
                    }
                )
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        const itemName = args[0];
        const quantity = args[1] ? parseInt(args[1]) : 1;

        if (isNaN(quantity) || quantity < 1) {
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Invalid Quantity')
                .setDescription('Please specify a valid quantity (1 or higher).')
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        try {
            const result = await EconomyService.sellItem(message.author.id, itemName, quantity);

            if (!result.success) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err)
                    .setTitle('❌ Sell Failed')
                    .setDescription(result.message)
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success)
                .setTitle('💰 Item Sold!')
                .setDescription(`Successfully sold **${quantity}x ${result.item!.name}**`)
                .addFields(
                    {
                        name: 'Sale Price',
                        value: `💸 **${result.totalValue!.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: 'New Balance',
                        value: `💎 **${result.newBalance!.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: 'Remaining Quantity',
                        value: `📦 **${result.remainingQuantity!}**`,
                        inline: true
                    }
                )
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp();

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in sell command:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing your sale. Please try again.')
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }
    }
}
