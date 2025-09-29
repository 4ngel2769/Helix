import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { EconomyModule } from '../../modules/Economy';
import { EmbedBuilder, MessageFlags, Message } from 'discord.js';
import config from '../../config';
import { EconomyService } from '../../lib/services/EconomyService';

@ApplyOptions<Command.Options>({
    name: 'daily',
    description: 'Claim your daily coins and rewards',
    aliases: ['day']
})
export class DailyCommand extends ModuleCommand<EconomyModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Economy',
            description: 'Claim your daily coins and rewards',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('daily')
                .setDescription('Claim your daily coins and rewards')
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const result = await this.processDaily(interaction.user.id, interaction.user.username);

            const embed = new EmbedBuilder()
                .setColor(result.success ? config.bot.embedColor.success : config.bot.embedColor.warn)
                .setTitle(result.success ? '💰 Daily Reward Claimed!' : '⏰ Daily Already Claimed')
                .setDescription(result.message)
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp();

            if (result.success && result.data) {
                embed.addFields(
                    {
                        name: '💸 Coins Earned',
                        value: `**${result.data.coinsEarned.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: '🔥 Current Streak',
                        value: `**${result.data.newStreak}** day${result.data.newStreak !== 1 ? 's' : ''}`,
                        inline: true
                    },
                    {
                        name: '💎 New Balance',
                        value: `**${result.data.newBalance.toLocaleString()}** coins`,
                        inline: true
                    }
                );

                if (result.data.bonusXP > 0) {
                    embed.addFields({
                        name: '⭐ Bonus XP',
                        value: `**+${result.data.bonusXP}** experience`,
                        inline: true
                    });
                }

                if (result.data.streakBonus > 0) {
                    embed.addFields({
                        name: '🎁 Streak Bonus',
                        value: `**+${result.data.streakBonus}** coins (${result.data.newStreak} day streak!)`,
                        inline: false
                    });
                }

                // Add motivational messages based on streak
                if (result.data.newStreak === 7) {
                    embed.setFooter({ text: '🎉 Amazing! You\'ve maintained your streak for a whole week!' });
                } else if (result.data.newStreak === 30) {
                    embed.setFooter({ text: '🔥 Incredible! One month of daily claims! You\'re on fire!' });
                } else if (result.data.newStreak >= 100) {
                    embed.setFooter({ text: '👑 Legendary dedication! 100+ day streak!' });
                } else if (result.data.newStreak % 10 === 0 && result.data.newStreak >= 10) {
                    embed.setFooter({ text: `🌟 ${result.data.newStreak} days strong! Keep it up!` });
                }
            } else if (!result.success && result.nextDailyTime) {
                embed.addFields({
                    name: '⏰ Next Daily Available',
                    value: `<t:${Math.floor(result.nextDailyTime.getTime() / 1000)}:R>`,
                    inline: false
                });
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in daily command:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing your daily reward. Please try again.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    public override async messageRun(message: Message) {
        try {
            const result = await this.processDaily(message.author.id, message.author.username);

            const embed = new EmbedBuilder()
                .setColor(result.success ? config.bot.embedColor.success : config.bot.embedColor.warn)
                .setTitle(result.success ? '💰 Daily Reward Claimed!' : '⏰ Daily Already Claimed')
                .setDescription(result.message)
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp();

            if (result.success && result.data) {
                embed.addFields(
                    {
                        name: '💸 Coins Earned',
                        value: `**${result.data.coinsEarned.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: '🔥 Current Streak',
                        value: `**${result.data.newStreak}** day${result.data.newStreak !== 1 ? 's' : ''}`,
                        inline: true
                    },
                    {
                        name: '💎 New Balance',
                        value: `**${result.data.newBalance.toLocaleString()}** coins`,
                        inline: true
                    }
                );

                if (result.data.bonusXP > 0) {
                    embed.addFields({
                        name: '⭐ Bonus XP',
                        value: `**+${result.data.bonusXP}** experience`,
                        inline: true
                    });
                }

                if (result.data.streakBonus > 0) {
                    embed.addFields({
                        name: '🎁 Streak Bonus',
                        value: `**+${result.data.streakBonus}** coins (${result.data.newStreak} day streak!)`,
                        inline: false
                    });
                }
            } else if (!result.success && result.nextDailyTime) {
                embed.addFields({
                    name: '⏰ Next Daily Available',
                    value: `<t:${Math.floor(result.nextDailyTime.getTime() / 1000)}:R>`,
                    inline: false
                });
            }

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in daily command:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing your daily reward. Please try again.')
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }
    }

    private async processDaily(userId: string, username: string) {
        try {
            const user = await EconomyService.getUser(userId, username);
            const now = new Date();
            
            // Check if user has already claimed daily in the last 12 hours
            if (user.economy.lastDaily) {
                const timeSinceLastDaily = now.getTime() - user.economy.lastDaily.getTime();
                const hoursWaited = timeSinceLastDaily / (1000 * 60 * 60);
                
                if (hoursWaited < 12) {
                    const nextDailyTime = new Date(user.economy.lastDaily.getTime() + (12 * 60 * 60 * 1000));
                    const hoursLeft = Math.ceil((nextDailyTime.getTime() - now.getTime()) / (1000 * 60 * 60));
                    const minutesLeft = Math.ceil(((nextDailyTime.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
                    
                    return {
                        success: false,
                        message: `You've already claimed your daily reward! Come back in **${hoursLeft}h ${minutesLeft}m**.`,
                        nextDailyTime
                    };
                }
            }

            // Calculate streak
            let newStreak = 1;
            if (user.economy.lastDaily) {
                const timeSinceLastDaily = now.getTime() - user.economy.lastDaily.getTime();
                const hoursSinceLastDaily = timeSinceLastDaily / (1000 * 60 * 60);
                
                // If last daily was between 12-36 hours ago, continue streak
                if (hoursSinceLastDaily >= 12 && hoursSinceLastDaily <= 36) {
                    newStreak = user.economy.dailyStreak + 1;
                } else if (hoursSinceLastDaily > 36) {
                    // Streak broken - reset to 1
                    newStreak = 1;
                }
            }

            // Calculate rewards
            const baseReward = 100;
            const streakBonus = this.calculateStreakBonus(newStreak);
            const levelBonus = Math.floor(user.economy.level * 10);
            const randomBonus = Math.floor(Math.random() * 50); // 0-49 bonus coins
            
            const totalCoins = baseReward + streakBonus + levelBonus + randomBonus;
            const bonusXP = Math.floor(totalCoins / 10); // 10% of coins earned as XP

            // Diamond rewards for long streaks (rare)
            let diamondsEarned = 0;
            if (newStreak >= 7 && Math.random() < 0.1) { // 10% chance at 7+ day streak
                diamondsEarned = 1;
            } else if (newStreak >= 30 && Math.random() < 0.25) { // 25% chance at 30+ day streak
                diamondsEarned = Math.floor(Math.random() * 3) + 1; // 1-3 diamonds
            } else if (newStreak >= 100 && Math.random() < 0.5) { // 50% chance at 100+ day streak
                diamondsEarned = Math.floor(Math.random() * 5) + 2; // 2-6 diamonds
            }

            // Add money and XP
            const moneyAdded = await EconomyService.addMoney(
                userId, 
                totalCoins, 
                'wallet', 
                `Daily reward (${newStreak} day streak)`
            );

            if (!moneyAdded) {
                return { success: false, message: 'Failed to add coins to your account.' };
            }

            // Add diamonds if earned
            if (diamondsEarned > 0) {
                await EconomyService.addDiamonds(userId, diamondsEarned, `Daily streak bonus (${newStreak} days)`);
            }

            // Add experience
            user.economy.experience += bonusXP;
            
            // Check for level up
            const newLevel = Math.floor(Math.sqrt(user.economy.experience / 100)) + 1;
            const leveledUp = newLevel > user.economy.level;
            if (leveledUp) {
                user.economy.level = newLevel;
            }

            // Update daily data
            user.economy.lastDaily = now;
            user.economy.dailyStreak = newStreak;

            await user.save();

            // Get updated balance
            const updatedUser = await EconomyService.getUser(userId, username);

            let message = `You claimed your daily reward and earned **${totalCoins.toLocaleString()}** coins!`;
            if (diamondsEarned > 0) {
                message += ` You also found **${diamondsEarned}** 💎 diamond${diamondsEarned > 1 ? 's' : ''}!`;
            }
            if (leveledUp) {
                message += ` You leveled up to **Level ${newLevel}**! 🎉`;
            }

            return {
                success: true,
                message,
                data: {
                    coinsEarned: totalCoins,
                    diamondsEarned,
                    newStreak,
                    streakBonus,
                    bonusXP,
                    newBalance: updatedUser.economy.wallet,
                    leveledUp,
                    newLevel: leveledUp ? newLevel : user.economy.level
                }
            };

        } catch (error) {
            console.error('Error processing daily:', error);
            return { success: false, message: 'An error occurred while processing your daily reward.' };
        }
    }

    private calculateStreakBonus(streak: number): number {
        if (streak < 3) return 0;
        if (streak < 7) return 25;
        if (streak < 14) return 50;
        if (streak < 30) return 100;
        if (streak < 60) return 200;
        if (streak < 100) return 400;
        return 500; // 100+ days
    }
}
