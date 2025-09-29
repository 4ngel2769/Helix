import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { EconomyModule } from '../../modules/Economy';
import { EmbedBuilder, MessageFlags, Message } from 'discord.js';
import config from '../../config';
import { EconomyService } from '../../lib/services/EconomyService';

@ApplyOptions<Command.Options>({
    name: 'withdraw',
    description: 'Withdraw money from your bank to your wallet',
    aliases: ['with', 'w']
})
export class WithdrawCommand extends ModuleCommand<EconomyModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Economy',
            description: 'Withdraw money from your bank to your wallet',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('withdraw')
                .setDescription('Withdraw money from your bank to your wallet')
                .addStringOption((option) =>
                    option
                        .setName('amount')
                        .setDescription('Amount to withdraw (use "all" to withdraw everything)')
                        .setRequired(true)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const amountInput = interaction.options.getString('amount', true);

        try {
            const result = await this.processWithdraw(interaction.user.id, interaction.user.username, amountInput);

            const embed = new EmbedBuilder()
                .setColor(result.success ? config.bot.embedColor.success : config.bot.embedColor.err)
                .setTitle(result.success ? '💰 Withdrawal Successful' : '❌ Withdrawal Failed')
                .setDescription(result.message)
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp();

            if (result.success && result.data) {
                embed.addFields(
                    {
                        name: 'Amount Withdrawn',
                        value: `💸 **${result.data.withdrawnAmount.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: 'New Wallet Balance',
                        value: `💎 **${result.data.newWalletBalance.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: 'Remaining Bank Balance',
                        value: `🏦 **${result.data.newBankBalance.toLocaleString()}** coins`,
                        inline: true
                    }
                );
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in withdraw command:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing your withdrawal. Please try again.')
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
                .setDescription('Please specify an amount to withdraw.\n\nUsage: `withdraw <amount>`')
                .addFields({
                    name: 'Examples',
                    value: '`withdraw 1000`\n`withdraw all`\n`withdraw 50%`',
                    inline: false
                })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        const amountInput = args[0];

        try {
            const result = await this.processWithdraw(message.author.id, message.author.username, amountInput);

            const embed = new EmbedBuilder()
                .setColor(result.success ? config.bot.embedColor.success : config.bot.embedColor.err)
                .setTitle(result.success ? '💰 Withdrawal Successful' : '❌ Withdrawal Failed')
                .setDescription(result.message)
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp();

            if (result.success && result.data) {
                embed.addFields(
                    {
                        name: 'Amount Withdrawn',
                        value: `💸 **${result.data.withdrawnAmount.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: 'New Wallet Balance',
                        value: `💎 **${result.data.newWalletBalance.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: 'Remaining Bank Balance',
                        value: `🏦 **${result.data.newBankBalance.toLocaleString()}** coins`,
                        inline: true
                    }
                );
            }

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in withdraw command:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing your withdrawal. Please try again.')
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }
    }

    private async processWithdraw(userId: string, username: string, amountInput: string) {
        try {
            const user = await EconomyService.getUser(userId, username);
            
            // Parse amount
            let amount: number;
            
            if (amountInput.toLowerCase() === 'all') {
                amount = user.economy.bank;
            } else if (amountInput.endsWith('%')) {
                const percentage = parseFloat(amountInput.slice(0, -1));
                if (isNaN(percentage) || percentage < 0 || percentage > 100) {
                    return { success: false, message: 'Invalid percentage. Please use a number between 0 and 100.' };
                }
                amount = Math.floor(user.economy.bank * (percentage / 100));
            } else {
                amount = parseInt(amountInput.replace(/[,\s]/g, ''));
                if (isNaN(amount) || amount < 1) {
                    return { success: false, message: 'Please enter a valid amount to withdraw.' };
                }
            }

            // Check if user has enough money in bank
            if (user.economy.bank < amount) {
                return { 
                    success: false, 
                    message: `You don't have enough money in your bank. You have **${user.economy.bank.toLocaleString()}** coins available.` 
                };
            }

            if (amount === 0) {
                return { success: false, message: 'You have no money to withdraw from your bank.' };
            }

            // Perform the withdrawal
            const transferSuccess = await EconomyService.transferMoney(userId, amount, 'bank', 'wallet');
            
            if (!transferSuccess) {
                return { success: false, message: 'Failed to process withdrawal. Please try again.' };
            }

            // Get updated user data
            const updatedUser = await EconomyService.getUser(userId, username);

            return {
                success: true,
                message: `Successfully withdrew **${amount.toLocaleString()}** coins from your bank!`,
                data: {
                    withdrawnAmount: amount,
                    newWalletBalance: updatedUser.economy.wallet,
                    newBankBalance: updatedUser.economy.bank
                }
            };

        } catch (error) {
            console.error('Error processing withdrawal:', error);
            return { success: false, message: 'An error occurred while processing your withdrawal.' };
        }
    }
}
