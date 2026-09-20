import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import { EconomyModule } from '../../modules/Economy';
import { EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ColorResolvable } from 'discord.js';
import { UserService } from '../../lib/services/economy/UserService';
import { MoneyService } from '../../lib/services/economy/MoneyService';
import { InventoryService } from '../../lib/services/economy/InventoryService';
import type { IUser, EconomyItem as InventoryItem } from '../../models/User';
import config from '../../config';

interface UpgradeTier {
    limit: number;
    coinCost: number;
    diamondCost: number;
}

import { HybridModuleCommand } from '../../lib/structures/HybridCommand';

@ApplyOptions<Command.Options>({
    name: 'bank-upgrade',
    description: 'Upgrade your bank storage capacity',
    aliases: ['bank-up', 'upgrade-bank']
})
export class BankUpgradeCommand extends HybridModuleCommand<EconomyModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Economy',
            description: 'Upgrade your bank storage capacity',
            enabled: true
        });
    }

    // Bank upgrade costs (coins and diamonds required for each tier)
    private readonly upgradeTiers = [
        { limit: 10000, coinCost: 0, diamondCost: 0 }, // Default tier
        { limit: 25000, coinCost: 50000, diamondCost: 0 }, // Tier 1
        { limit: 50000, coinCost: 100000, diamondCost: 1 }, // Tier 2
        { limit: 100000, coinCost: 200000, diamondCost: 3 }, // Tier 3
        { limit: 200000, coinCost: 500000, diamondCost: 5 }, // Tier 4
        { limit: 500000, coinCost: 1000000, diamondCost: 10 }, // Tier 5
        { limit: 1000000, coinCost: 2000000, diamondCost: 20 }, // Tier 6
        { limit: 25000000, coinCost: 5000000, diamondCost: 50 }, // Tier 7
        { limit: 300000000, coinCost: 10000000, diamondCost: 100 }, // Tier 8
        { limit: 3000000000, coinCost: 100000000, diamondCost: 250 }, // Tier 9
        { limit: 100000000000, coinCost: 5000000000, diamondCost: 1000 }, // Tier 10 (100 billion)
    ];

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('bank-upgrade')
                .setDescription('Upgrade your bank storage capacity')
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('info')
                        .setDescription('View your current bank tier and available upgrades')
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('buy')
                        .setDescription('Purchase a bank upgrade')
                        .addIntegerOption((option) =>
                            option
                                .setName('tier')
                                .setDescription('Bank tier to upgrade to (1-10)')
                                .setRequired(true)
                                .setMinValue(1)
                                .setMaxValue(10)
                        )
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'info':
                return this.handleInfo(interaction);
            case 'buy':
                return this.handleBuy(interaction);
            default:
                return interaction.reply({
                    content: 'Invalid subcommand. Use `/bank-upgrade info` or `/bank-upgrade buy <tier>`',
                    flags: MessageFlags.Ephemeral
                });
        }
    }

    private async handleInfo(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const user = await UserService.getUser(interaction.user.id, interaction.user.username);
            const currentTier = this.getCurrentTier(user.economy.bankLimit);
            const diamonds = this.getUserDiamonds(user);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle('ðŸ¦ Bank Upgrade Information')
                .setDescription(`Your current bank capacity and available upgrades`)
                .addFields(
                    {
                        name: 'Current Status',
                        value: [
                            `ðŸ¦ **Bank Limit:** ${user.economy.bankLimit.toLocaleString()} coins`,
                            `ðŸ“Š **Current Tier:** ${currentTier}`,
                            `ðŸ’Ž **Diamonds:** ${diamonds.toLocaleString()}`,
                            `ðŸ’° **Wallet:** ${user.economy.wallet.toLocaleString()} coins`
                        ].join('\n'),
                        inline: false
                    }
                )
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp();

            // Add available upgrades
            let upgradesText = '';
            for (let i = currentTier; i < this.upgradeTiers.length; i++) {
                const tier = this.upgradeTiers[i];
                const tierNumber = i;
                
                if (tierNumber === currentTier) continue; // Skip current tier
                
                const affordable = this.canAffordUpgrade(user, tier, diamonds);
                const status = affordable ? 'âœ…' : 'âŒ';
                
                upgradesText += `${status} **Tier ${tierNumber}:** ${tier.limit.toLocaleString()} coins\n`;
                upgradesText += `   ðŸ’° ${tier.coinCost.toLocaleString()} coins`;
                if (tier.diamondCost > 0) {
                    upgradesText += ` + ðŸ’Ž ${tier.diamondCost} diamonds`;
                }
                upgradesText += '\n\n';
                
                if (upgradesText.length > 800) {
                    upgradesText += '...and more';
                    break;
                }
            }

            if (upgradesText) {
                embed.addFields({
                    name: 'Available Upgrades',
                    value: upgradesText.trim(),
                    inline: false
                });
            } else {
                embed.addFields({
                    name: 'Upgrades',
                    value: 'ðŸŽ‰ You have reached the maximum bank tier!',
                    inline: false
                });
            }

            embed.addFields({
                name: 'How to Get Diamonds',
                value: [
                    'ðŸ’Ž Diamonds are rare currency obtained through:',
                    'â€¢ Daily rewards (rare chance)',
                    'â€¢ Special events',
                    'â€¢ High-level achievements',
                    'â€¢ Premium shop purchases',
                    'â€¢ Auction rare finds'
                ].join('\n'),
                inline: false
            });

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            this.container.logger.error('Error in bank upgrade info:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('âŒ Error')
                .setDescription('An error occurred while fetching bank upgrade information.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private async handleBuy(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const targetTier = interaction.options.getInteger('tier', true);

        try {
            const user = await UserService.getUser(interaction.user.id, interaction.user.username);
            const currentTier = this.getCurrentTier(user.economy.bankLimit);
            const diamonds = this.getUserDiamonds(user);

            // Validation
            if (targetTier <= currentTier) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err as ColorResolvable)
                    .setTitle('âŒ Invalid Upgrade')
                    .setDescription(`You are already at tier ${currentTier}. You can only upgrade to tier ${currentTier + 1} or higher.`)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            if (targetTier >= this.upgradeTiers.length) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err as ColorResolvable)
                    .setTitle('âŒ Invalid Tier')
                    .setDescription(`Maximum tier is ${this.upgradeTiers.length - 1}.`)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const upgrade = this.upgradeTiers[targetTier];

            // Check if user can afford it
            if (!this.canAffordUpgrade(user, upgrade, diamonds)) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err as ColorResolvable)
                    .setTitle('ðŸ’¸ Insufficient Funds')
                    .setDescription('You cannot afford this upgrade.')
                    .addFields(
                        {
                            name: 'Required',
                            value: [
                                `ðŸ’° ${upgrade.coinCost.toLocaleString()} coins`,
                                upgrade.diamondCost > 0 ? `ðŸ’Ž ${upgrade.diamondCost} diamonds` : ''
                            ].filter(Boolean).join('\n'),
                            inline: true
                        },
                        {
                            name: 'You Have',
                            value: [
                                `ðŸ’° ${user.economy.wallet.toLocaleString()} coins`,
                                `ðŸ’Ž ${diamonds.toLocaleString()} diamonds`
                            ].join('\n'),
                            inline: true
                        }
                    )
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            // Create confirmation embed
            const confirmEmbed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle('ðŸ¦ Confirm Bank Upgrade')
                .setDescription(`Are you sure you want to upgrade to **Tier ${targetTier}**?`)
                .addFields(
                    {
                        name: 'Upgrade Details',
                        value: [
                            `ðŸ¦ **New Limit:** ${upgrade.limit.toLocaleString()} coins`,
                            `ðŸ“ˆ **Increase:** +${(upgrade.limit - user.economy.bankLimit).toLocaleString()} coins`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: 'Cost',
                        value: [
                            `ðŸ’° ${upgrade.coinCost.toLocaleString()} coins`,
                            upgrade.diamondCost > 0 ? `ðŸ’Ž ${upgrade.diamondCost} diamonds` : ''
                        ].filter(Boolean).join('\n'),
                        inline: true
                    }
                )
                .setTimestamp();

            const confirmRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`bank_upgrade_confirm_${targetTier}`)
                        .setLabel('Confirm Upgrade')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('âœ…'),
                    new ButtonBuilder()
                        .setCustomId('bank_upgrade_cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('âŒ')
                );

            const response = await interaction.editReply({ 
                embeds: [confirmEmbed], 
                components: [confirmRow] 
            });

            // Set up collector for confirmation
            const collector = response.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 30000 // 30 seconds
            });

            collector.on('collect', async (i) => {
                // Check if interaction is still valid
                if (i.replied || i.deferred) {
                    return;
                }
                if (i.customId === 'bank_upgrade_cancel') {
                    const cancelEmbed = new EmbedBuilder()
                        .setColor(config.bot.embedColor.warn as ColorResolvable)
                        .setTitle('âŒ Upgrade Cancelled')
                        .setDescription('Bank upgrade has been cancelled.')
                        .setTimestamp();

                    return i.update({ embeds: [cancelEmbed], components: [] });
                }

                if (i.customId.startsWith('bank_upgrade_confirm_')) {
                    // Remove the deferUpdate() call since we're going to use update() immediately
                    try {
                        // Perform the upgrade
                        const success = await this.performUpgrade(user.userId, targetTier);
                        
                        if (success) {
                            const successEmbed = new EmbedBuilder()
                                .setColor(config.bot.embedColor.success as ColorResolvable)
                                .setTitle('ðŸŽ‰ Bank Upgraded Successfully!')
                                .setDescription(`Your bank has been upgraded to **Tier ${targetTier}**!`)
                                .addFields(
                                    {
                                        name: 'New Bank Limit',
                                        value: `ðŸ¦ **${upgrade.limit.toLocaleString()}** coins`,
                                        inline: true
                                    },
                                    {
                                        name: 'Capacity Increase',
                                        value: `ðŸ“ˆ **+${(upgrade.limit - user.economy.bankLimit).toLocaleString()}** coins`,
                                        inline: true
                                    }
                                )
                                .setThumbnail(interaction.user.displayAvatarURL())
                                .setTimestamp();

                            return i.update({ embeds: [successEmbed], components: [] });
                        } else {
                            throw new Error('Upgrade failed');
                        }
                    } catch (error) {
                        this.container.logger.error('Error performing bank upgrade:', error);
                        
                        const errorEmbed = new EmbedBuilder()
                            .setColor(config.bot.embedColor.err as ColorResolvable)
                            .setTitle('âŒ Upgrade Failed')
                            .setDescription('An error occurred while processing the upgrade. Your funds have not been charged.')
                            .setTimestamp();

                        return i.update({ embeds: [errorEmbed], components: [] });
                    }
                }

                return;
            });

            collector.on('end', (collected) => {
                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor(config.bot.embedColor.warn as ColorResolvable)
                        .setTitle('â° Upgrade Expired')
                        .setDescription('Bank upgrade confirmation timed out.')
                        .setTimestamp();

                    interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => null);
                }
            });

        } catch (error) {
            this.container.logger.error('Error in bank upgrade buy:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('âŒ Error')
                .setDescription('An error occurred while processing the bank upgrade.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        return;
    }

    private getCurrentTier(bankLimit: number): number {
        for (let i = 0; i < this.upgradeTiers.length; i++) {
            if (this.upgradeTiers[i].limit === bankLimit) {
                return i;
            }
        }
        return 0; // Default to tier 0 if not found
    }

    private getUserDiamonds(user: IUser): number {
        // Look for diamonds in user's inventory
        const diamondItem = user.economy.inventory.find((item: InventoryItem) => 
            item.itemId === 'diamond' || item.name.toLowerCase().includes('diamond')
        );
        return diamondItem ? diamondItem.quantity : 0;
    }

    private canAffordUpgrade(user: IUser, upgrade: UpgradeTier, diamonds: number): boolean {
        const hasEnoughCoins = user.economy.wallet >= upgrade.coinCost;
        const hasEnoughDiamonds = diamonds >= upgrade.diamondCost;
        return hasEnoughCoins && hasEnoughDiamonds;
    }

    private async performUpgrade(userId: string, targetTier: number): Promise<boolean> {
        try {
            const user = await UserService.getUser(userId, 'User');
            const upgrade = this.upgradeTiers[targetTier];
            const diamonds = this.getUserDiamonds(user);

            // Double-check affordability
            if (!this.canAffordUpgrade(user, upgrade, diamonds)) {
                return false;
            }

            // Remove coins
            const coinsRemoved = await MoneyService.removeMoney(
                userId, 
                upgrade.coinCost, 
                'wallet', 
                `Bank upgrade to tier ${targetTier}`
            );

            if (!coinsRemoved) {
                return false;
            }

            // Remove diamonds if required
            if (upgrade.diamondCost > 0) {
                const diamondRemoved = await InventoryService.removeItem(userId, 'diamond', upgrade.diamondCost);
                if (!diamondRemoved) {
                    // Refund coins if diamond removal failed
                    await MoneyService.addMoney(userId, upgrade.coinCost, 'wallet', 'Bank upgrade refund');
                    return false;
                }
            }

            // Update bank limit
            user.economy.bankLimit = upgrade.limit;
            await user.save();

            return true;
        } catch (error) {
            this.container.logger.error('Error performing bank upgrade:', error);
            return false;
        }
    }
}
