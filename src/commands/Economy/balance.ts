import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { EconomyModule } from '../../modules/Economy';
import { EmbedBuilder, MessageFlags, Message } from 'discord.js';
import { EconomyService } from '../../lib/services/EconomyService';
import type { IUser, EconomyItem as InventoryItem } from '../../models/User';
import config from '../../config';

@ApplyOptions<Command.Options>({
    name: 'balance',
    description: 'Check your money balance',
    aliases: ['bal', 'money']
})
export class BalanceCommand extends ModuleCommand<EconomyModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Economy',
            description: 'Check your money balance',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('balance')
                .setDescription('Check your money balance')
                .addUserOption((option) =>
                    option
                        .setName('user')
                        .setDescription('User to check balance for (defaults to yourself)')
                        .setRequired(false)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const user = await EconomyService.getUser(targetUser.id, targetUser.username);

        // Get diamonds from inventory
        const diamonds = this.getUserDiamonds(user);

        const total = user.economy.wallet + user.economy.bank;
        const bankUsage = user.economy.bankLimit > 0 ? 
            Math.round((user.economy.bank / user.economy.bankLimit) * 100) : 0;

        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default)
            .setTitle('💰 Balance')
            .setDescription(`**${targetUser.displayName}'s** current balance`)
            .addFields(
                {
                    name: '💸 Wallet',
                    value: `**${user.economy.wallet.toLocaleString()}** coins`,
                    inline: true
                },
                {
                    name: '🏦 Bank',
                    value: `**${user.economy.bank.toLocaleString()}** / ${user.economy.bankLimit.toLocaleString()} coins\n(${bankUsage}% full)`,
                    inline: true
                },
                {
                    name: '💎 Diamonds', // Add diamonds field
                    value: `**${diamonds.toLocaleString()}** diamonds`,
                    inline: true
                },
                {
                    name: '💰 Total Coins',
                    value: `**${total.toLocaleString()}** coins`,
                    inline: true
                },
                {
                    name: '📊 Level',
                    value: `Level **${user.economy.level}**\n${user.economy.experience} XP`,
                    inline: true
                },
                {
                    name: '🔥 Daily Streak',
                    value: `**${user.economy.dailyStreak}** days`,
                    inline: true
                },
                {
                    name: '📦 Items',
                    value: `**${user.economy.inventory.length}** unique items`,
                    inline: true
                }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        return interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
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

        const user = await EconomyService.getUser(targetUser.id, targetUser.username);
        const diamonds = this.getUserDiamonds(user);
        const total = user.economy.wallet + user.economy.bank;
        const bankUsage = user.economy.bankLimit > 0 ? 
            Math.round((user.economy.bank / user.economy.bankLimit) * 100) : 0;

        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default)
            .setTitle('💰 Balance')
            .setDescription(`**${targetUser.displayName}'s** current balance`)
            .addFields(
                {
                    name: '💸 Wallet',
                    value: `**${user.economy.wallet.toLocaleString()}** coins`,
                    inline: true
                },
                {
                    name: '🏦 Bank',
                    value: `**${user.economy.bank.toLocaleString()}** / ${user.economy.bankLimit.toLocaleString()} coins\n(${bankUsage}% full)`,
                    inline: true
                },
                {
                    name: '💎 Diamonds', // Add diamonds field
                    value: `**${diamonds.toLocaleString()}** diamonds`,
                    inline: true
                },
                {
                    name: '💰 Total Coins',
                    value: `**${total.toLocaleString()}** coins`,
                    inline: true
                },
                {
                    name: '📊 Level',
                    value: `Level **${user.economy.level}**\n${user.economy.experience} XP`,
                    inline: true
                },
                {
                    name: '🔥 Daily Streak',
                    value: `**${user.economy.dailyStreak}** days`,
                    inline: true
                },
                {
                    name: '📦 Items',
                    value: `**${user.economy.inventory.length}** unique items`,
                    inline: true
                }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }

    // Add this helper method to the class
    private getUserDiamonds(user: IUser): number {
        // Look for diamonds in user's inventory
        const diamondItem = user.economy.inventory.find((item: InventoryItem) => 
            item.itemId === 'diamond' || item.name.toLowerCase().includes('diamond')
        );
        return diamondItem ? diamondItem.quantity : 0;
    }
}