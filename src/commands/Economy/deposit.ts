import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { EconomyModule } from '../../modules/Economy';
import { EmbedBuilder, MessageFlags, Message } from 'discord.js';
import config from '../../config';
import { UserService } from '../../lib/services/economy/UserService';
import { MoneyService } from '../../lib/services/economy/MoneyService';

@ApplyOptions<Command.Options>({
    name: 'deposit',
    description: 'Deposit money from your wallet to your bank',
    aliases: ['dep', 'd']
})
export class DepositCommand extends ModuleCommand<EconomyModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Economy',
            description: 'Deposit money from your wallet to your bank',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('deposit')
                .setDescription('Deposit money from your wallet to your bank')
                .addStringOption((option) =>
                    option
                        .setName('amount')
                        .setDescription('Amount to deposit (use "all" to deposit everything)')
                        .setRequired(true)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const amountInput = interaction.options.getString('amount', true);

        try {
            const result = await this.processDeposit(interaction.user.id, interaction.user.username, amountInput);

            const embed = new EmbedBuilder()
                .setColor(result.success ? config.bot.embedColor.success : config.bot.embedColor.err)
                .setTitle(result.success ? '🏦 Deposit Successful' : '❌ Deposit Failed')
                .setDescription(result.message)
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp();

            if (result.success && result.data) {
                embed.addFields(
                    {
                        name: 'Amount Deposited',
                        value: `💸 **${result.data.depositedAmount.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: 'New Bank Balance',
                        value: `🏦 **${result.data.newBankBalance.toLocaleString()}**/${result.data.bankLimit.toLocaleString()} coins`,
                        inline: true
                    },
                    {
                        name: 'Remaining Wallet',
                        value: `💎 **${result.data.newWalletBalance.toLocaleString()}** coins`,
                        inline: true
                    }
                );

                // Add bank usage percentage
                const bankUsage = Math.round((result.data.newBankBalance / result.data.bankLimit) * 100);
                embed.addFields({
                    name: 'Bank Usage',
                    value: `📊 **${bankUsage}%** full`,
                    inline: true
                });
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            this.container.logger.error('Error in deposit command:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing your deposit. Please try again.')
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
                .setDescription('Please specify an amount to deposit.\n\nUsage: `deposit <amount>`')
                .addFields({
                    name: 'Examples',
                    value: '`deposit 1000`\n`deposit all`\n`deposit 75%`',
                    inline: false
                })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        const amountInput = args[0];

        try {
            const result = await this.processDeposit(message.author.id, message.author.username, amountInput);

            const embed = new EmbedBuilder()
                .setColor(result.success ? config.bot.embedColor.success : config.bot.embedColor.err)
                .setTitle(result.success ? '🏦 Deposit Successful' : '❌ Deposit Failed')
                .setDescription(result.message)
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp();

            if (result.success && result.data) {
                embed.addFields(
                    {
                        name: 'Amount Deposited',
                        value: `💸 **${result.data.depositedAmount.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: 'New Bank Balance',
                        value: `🏦 **${result.data.newBankBalance.toLocaleString()}**/${result.data.bankLimit.toLocaleString()} coins`,
                        inline: true
                    },
                    {
                        name: 'Remaining Wallet',
                        value: `💎 **${result.data.newWalletBalance.toLocaleString()}** coins`,
                        inline: true
                    }
                );

                const bankUsage = Math.round((result.data.newBankBalance / result.data.bankLimit) * 100);
                embed.addFields({
                    name: 'Bank Usage',
                    value: `📊 **${bankUsage}%** full`,
                    inline: true
                });
            }

            return message.reply({ embeds: [embed] });

        } catch (error) {
            this.container.logger.error('Error in deposit command:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing your deposit. Please try again.')
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }
    }

    private async processDeposit(userId: string, username: string, amountInput: string) {
        try {
            const user = await UserService.getUser(userId, username);
            
            // Parse amount
            let amount: number;
            
            if (amountInput.toLowerCase() === 'all') {
                // Deposit all wallet money, but respect bank limit
                const maxDeposit = user.economy.bankLimit - user.economy.bank;
                amount = Math.min(user.economy.wallet, maxDeposit);
            } else if (amountInput.endsWith('%')) {
                const percentage = parseFloat(amountInput.slice(0, -1));
                if (isNaN(percentage) || percentage < 0 || percentage > 100) {
                    return { success: false, message: 'Invalid percentage. Please use a number between 0 and 100.' };
                }
                const maxDeposit = user.economy.bankLimit - user.economy.bank;
                amount = Math.min(
                    Math.floor(user.economy.wallet * (percentage / 100)),
                    maxDeposit
                );
            } else {
                amount = parseInt(amountInput.replace(/[,\s]/g, ''));
                if (isNaN(amount) || amount < 1) {
                    return { success: false, message: 'Please enter a valid amount to deposit.' };
                }
            }

            // Check if user has enough money in wallet
            if (user.economy.wallet < amount) {
                return { 
                    success: false, 
                    message: `You don't have enough money in your wallet. You have **${user.economy.wallet.toLocaleString()}** coins available.` 
                };
            }

            // Check bank space
            const availableBankSpace = user.economy.bankLimit - user.economy.bank;
            if (availableBankSpace <= 0) {
                return { 
                    success: false, 
                    message: `Your bank is full! Bank: **${user.economy.bank.toLocaleString()}**/**${user.economy.bankLimit.toLocaleString()}** coins` 
                };
            }

            if (amount > availableBankSpace) {
                return { 
                    success: false, 
                    message: `You can only deposit **${availableBankSpace.toLocaleString()}** more coins. Your bank is almost full!` 
                };
            }

            if (amount === 0) {
                return { success: false, message: 'You have no money to deposit or your bank is full.' };
            }

            // Perform the deposit
            const transferSuccess = await MoneyService.transferMoney(userId, amount, 'wallet', 'bank');
            
            if (!transferSuccess) {
                return { success: false, message: 'Failed to process deposit. Please try again.' };
            }

            // Get updated user data
            const updatedUser = await UserService.getUser(userId, username);

            return {
                success: true,
                message: `Successfully deposited **${amount.toLocaleString()}** coins to your bank!`,
                data: {
                    depositedAmount: amount,
                    newBankBalance: updatedUser.economy.bank,
                    newWalletBalance: updatedUser.economy.wallet,
                    bankLimit: updatedUser.economy.bankLimit
                }
            };

        } catch (error) {
            this.container.logger.error('Error processing deposit:', error);
            return { success: false, message: 'An error occurred while processing your deposit.' };
        }
    }
}
