import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags, ColorResolvable } from 'discord.js';
import { EconomyService } from '../../lib/services/EconomyService';
import { EconomyItem } from '../../models/EconomyItem';
import { User } from '../../models/User';
import config from '../../config';

@ApplyOptions<Command.Options>({
    name: 'user-manage',
    description: 'Manage user economy data (Developer Only)',
    aliases: ['usermanage', 'manageuser', 'eco-admin'],
    preconditions: ['OwnerOnly']
})
export class UserManageCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addSubcommandGroup((group) =>
                    group
                        .setName('money')
                        .setDescription('Manage user money')
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('add')
                                .setDescription('Add money to a user')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('amount')
                                        .setDescription('Amount to add')
                                        .setRequired(true)
                                        .setMinValue(1)
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('location')
                                        .setDescription('Where to add the money')
                                        .setRequired(false)
                                        .addChoices(
                                            { name: 'Wallet', value: 'wallet' },
                                            { name: 'Bank', value: 'bank' }
                                        )
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('reason')
                                        .setDescription('Reason for adding money')
                                        .setRequired(false)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('remove')
                                .setDescription('Remove money from a user')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('amount')
                                        .setDescription('Amount to remove')
                                        .setRequired(true)
                                        .setMinValue(1)
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('location')
                                        .setDescription('Where to remove the money from')
                                        .setRequired(false)
                                        .addChoices(
                                            { name: 'Wallet', value: 'wallet' },
                                            { name: 'Bank', value: 'bank' }
                                        )
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('reason')
                                        .setDescription('Reason for removing money')
                                        .setRequired(false)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('set')
                                .setDescription('Set user money to a specific amount')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('wallet')
                                        .setDescription('Set wallet amount')
                                        .setRequired(false)
                                        .setMinValue(0)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('bank')
                                        .setDescription('Set bank amount')
                                        .setRequired(false)
                                        .setMinValue(0)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('bank-limit')
                                        .setDescription('Set bank limit')
                                        .setRequired(false)
                                        .setMinValue(1000)
                                )
                        )
                )
                .addSubcommandGroup((group) =>
                    group
                        .setName('diamonds')
                        .setDescription('Manage user diamonds')
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('add')
                                .setDescription('Add diamonds to a user')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('amount')
                                        .setDescription('Amount of diamonds to add')
                                        .setRequired(true)
                                        .setMinValue(1)
                                        .setMaxValue(10000)
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('reason')
                                        .setDescription('Reason for adding diamonds')
                                        .setRequired(false)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('remove')
                                .setDescription('Remove diamonds from a user')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('amount')
                                        .setDescription('Amount of diamonds to remove')
                                        .setRequired(true)
                                        .setMinValue(1)
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('reason')
                                        .setDescription('Reason for removing diamonds')
                                        .setRequired(false)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('set')
                                .setDescription('Set user diamond amount')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('amount')
                                        .setDescription('Diamond amount to set')
                                        .setRequired(true)
                                        .setMinValue(0)
                                        .setMaxValue(100000)
                                )
                        )
                )
                .addSubcommandGroup((group) =>
                    group
                        .setName('items')
                        .setDescription('Manage user items')
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('give')
                                .setDescription('Give an item to a user')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('item-id')
                                        .setDescription('Item ID to give')
                                        .setRequired(true)
                                        .setAutocomplete(true)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('quantity')
                                        .setDescription('Quantity to give')
                                        .setRequired(false)
                                        .setMinValue(1)
                                        .setMaxValue(1000)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('take')
                                .setDescription('Take an item from a user')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('item-id')
                                        .setDescription('Item ID to take')
                                        .setRequired(true)
                                        .setAutocomplete(true)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('quantity')
                                        .setDescription('Quantity to take')
                                        .setRequired(false)
                                        .setMinValue(1)
                                        .setMaxValue(1000)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('clear')
                                .setDescription('Clear a user\'s inventory')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('category')
                                        .setDescription('Category to clear (leave empty to clear all)')
                                        .setRequired(false)
                                        .addChoices(
                                            { name: 'Tools', value: 'tools' },
                                            { name: 'Weapons', value: 'weapons' },
                                            { name: 'Consumables', value: 'consumables' },
                                            { name: 'Materials', value: 'materials' },
                                            { name: 'Collectibles', value: 'collectibles' },
                                            { name: 'Misc', value: 'misc' }
                                        )
                                )
                        )
                )
                .addSubcommandGroup((group) =>
                    group
                        .setName('profile')
                        .setDescription('Manage user profile')
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('reset')
                                .setDescription('Reset a user\'s economy profile')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addBooleanOption((option) =>
                                    option
                                        .setName('confirm')
                                        .setDescription('Confirm you want to reset this user\'s profile')
                                        .setRequired(true)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('view')
                                .setDescription('View detailed user economy data')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                        )
                ),
            {
                idHints: ['1234567890123456790']
            }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        if (group === 'money') {
            switch (subcommand) {
                case 'add':
                    return this.handleMoneyAdd(interaction);
                case 'remove':
                    return this.handleMoneyRemove(interaction);
                case 'set':
                    return this.handleMoneySet(interaction);
            }
        } else if (group === 'diamonds') {
            switch (subcommand) {
                case 'add':
                    return this.handleDiamondsAdd(interaction);
                case 'remove':
                    return this.handleDiamondsRemove(interaction);
                case 'set':
                    return this.handleDiamondsSet(interaction);
            }
        } else if (group === 'items') {
            switch (subcommand) {
                case 'give':
                    return this.handleItemGive(interaction);
                case 'take':
                    return this.handleItemTake(interaction);
                case 'clear':
                    return this.handleItemClear(interaction);
            }
        } else if (group === 'profile') {
            switch (subcommand) {
                case 'reset':
                    return this.handleProfileReset(interaction);
                case 'view':
                    return this.handleProfileView(interaction);
            }
        }

        return interaction.reply({ content: 'Invalid command usage', ephemeral: true });
    }

    // Money management methods (existing)
    private async handleMoneyAdd(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('user', true);
        const amount = interaction.options.getInteger('amount', true);
        const location = (interaction.options.getString('location') as 'wallet' | 'bank') || 'wallet';
        const reason = interaction.options.getString('reason') || `Money added by ${interaction.user.tag} (Developer)`;

        try {
            const success = await EconomyService.addMoney(target.id, amount, location, reason);

            if (!success) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err as ColorResolvable)
                    .setTitle('❌ Failed to Add Money')
                    .setDescription('Could not add money to user account.')
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const user = await EconomyService.getUser(target.id, target.username);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('💰 Money Added')
                .setDescription(`Successfully added **${amount.toLocaleString()}** coins to ${target.displayName}'s ${location}.`)
                .addFields(
                    { name: 'New Balance', value: `💰 Wallet: ${user.economy.wallet.toLocaleString()}\n🏦 Bank: ${user.economy.bank.toLocaleString()}`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setThumbnail(target.displayAvatarURL())
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error adding money:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Error')
                .setDescription('An error occurred while adding money.')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private async handleMoneyRemove(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('user', true);
        const amount = interaction.options.getInteger('amount', true);
        const location = (interaction.options.getString('location') as 'wallet' | 'bank') || 'wallet';
        const reason = interaction.options.getString('reason') || `Money removed by ${interaction.user.tag} (Developer)`;

        try {
            const success = await EconomyService.removeMoney(target.id, amount, location, reason);

            if (!success) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err as ColorResolvable)
                    .setTitle('❌ Failed to Remove Money')
                    .setDescription('Could not remove money from user account. They may not have enough funds.')
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const user = await EconomyService.getUser(target.id, target.username);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('💸 Money Removed')
                .setDescription(`Successfully removed **${amount.toLocaleString()}** coins from ${target.displayName}'s ${location}.`)
                .addFields(
                    { name: 'New Balance', value: `💰 Wallet: ${user.economy.wallet.toLocaleString()}\n🏦 Bank: ${user.economy.bank.toLocaleString()}`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setThumbnail(target.displayAvatarURL())
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error removing money:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Error')
                .setDescription('An error occurred while removing money.')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private async handleMoneySet(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('user', true);
        const walletAmount = interaction.options.getInteger('wallet');
        const bankAmount = interaction.options.getInteger('bank');
        const bankLimit = interaction.options.getInteger('bank-limit');

        if (walletAmount === null && bankAmount === null && bankLimit === null) {
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Invalid Input')
                .setDescription('You must specify at least one value to set (wallet, bank, or bank-limit).')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        try {
            const userToUpdate = await User.findOne({ userId: target.id });
            if (!userToUpdate) {
                await EconomyService.getUser(target.id, target.username); // Create user
                const newUser = await User.findOne({ userId: target.id });
                if (!newUser) throw new Error('Failed to create user');
            }

            const user = await User.findOne({ userId: target.id });
            if (!user) throw new Error('User not found after creation');

            const oldWallet = user.economy.wallet;
            const oldBank = user.economy.bank;
            const oldBankLimit = user.economy.bankLimit;

            if (walletAmount !== null) user.economy.wallet = walletAmount;
            if (bankAmount !== null) user.economy.bank = bankAmount;
            if (bankLimit !== null) user.economy.bankLimit = bankLimit;

            await user.save();

            const changes: string[] = [];
            if (walletAmount !== null) changes.push(`💰 Wallet: ${oldWallet.toLocaleString()} → ${walletAmount.toLocaleString()}`);
            if (bankAmount !== null) changes.push(`🏦 Bank: ${oldBank.toLocaleString()} → ${bankAmount.toLocaleString()}`);
            if (bankLimit !== null) changes.push(`📊 Bank Limit: ${oldBankLimit.toLocaleString()} → ${bankLimit.toLocaleString()}`);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('⚙️ Economy Values Updated')
                .setDescription(`Successfully updated ${target.displayName}'s economy data.`)
                .addFields(
                    { name: 'Changes Made', value: changes.join('\n'), inline: false },
                    { name: 'Current Balance', value: `💰 Wallet: ${user.economy.wallet.toLocaleString()}\n🏦 Bank: ${user.economy.bank.toLocaleString()}/${user.economy.bankLimit.toLocaleString()}`, inline: true }
                )
                .setThumbnail(target.displayAvatarURL())
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error setting money:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Error')
                .setDescription('An error occurred while setting money values.')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    // Diamond management methods (NEW)
    private async handleDiamondsAdd(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('user', true);
        const amount = interaction.options.getInteger('amount', true);
        const reason = interaction.options.getString('reason') || `Diamonds added by ${interaction.user.tag} (Developer)`;

        try {
            const oldDiamonds = await EconomyService.getDiamonds(target.id);
            const success = await EconomyService.addDiamonds(target.id, amount, reason);

            if (!success) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err as ColorResolvable)
                    .setTitle('❌ Failed to Add Diamonds')
                    .setDescription('Could not add diamonds to user account.')
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const newDiamonds = await EconomyService.getDiamonds(target.id);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('💎 Diamonds Added')
                .setDescription(`Successfully added **${amount.toLocaleString()}** diamonds to ${target.displayName}.`)
                .addFields(
                    { name: 'Diamond Balance', value: `💎 ${oldDiamonds.toLocaleString()} → ${newDiamonds.toLocaleString()}`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setThumbnail(target.displayAvatarURL())
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error adding diamonds:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Error')
                .setDescription('An error occurred while adding diamonds.')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private async handleDiamondsRemove(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('user', true);
        const amount = interaction.options.getInteger('amount', true);
        const reason = interaction.options.getString('reason') || `Diamonds removed by ${interaction.user.tag} (Developer)`;

        try {
            const oldDiamonds = await EconomyService.getDiamonds(target.id);
            
            if (oldDiamonds < amount) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err as ColorResolvable)
                    .setTitle('❌ Insufficient Diamonds')
                    .setDescription(`${target.displayName} only has ${oldDiamonds.toLocaleString()} diamonds, but you tried to remove ${amount.toLocaleString()}.`)
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const success = await EconomyService.removeItem(target.id, 'diamond', amount);

            if (!success) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err as ColorResolvable)
                    .setTitle('❌ Failed to Remove Diamonds')
                    .setDescription('Could not remove diamonds from user account.')
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const newDiamonds = await EconomyService.getDiamonds(target.id);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('💎 Diamonds Removed')
                .setDescription(`Successfully removed **${amount.toLocaleString()}** diamonds from ${target.displayName}.`)
                .addFields(
                    { name: 'Diamond Balance', value: `💎 ${oldDiamonds.toLocaleString()} → ${newDiamonds.toLocaleString()}`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setThumbnail(target.displayAvatarURL())
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error removing diamonds:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Error')
                .setDescription('An error occurred while removing diamonds.')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private async handleDiamondsSet(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('user', true);
        const amount = interaction.options.getInteger('amount', true);

        try {
            const oldDiamonds = await EconomyService.getDiamonds(target.id);

            // Remove all existing diamonds first
            if (oldDiamonds > 0) {
                await EconomyService.removeItem(target.id, 'diamond', oldDiamonds);
            }

            // Add the new amount
            if (amount > 0) {
                const success = await EconomyService.addDiamonds(target.id, amount, `Diamonds set by ${interaction.user.tag} (Developer)`);
                
                if (!success) {
                    // Restore old diamonds if setting failed
                    await EconomyService.addDiamonds(target.id, oldDiamonds, 'Restoration after failed set operation');
                    
                    const embed = new EmbedBuilder()
                        .setColor(config.bot.embedColor.err as ColorResolvable)
                        .setTitle('❌ Failed to Set Diamonds')
                        .setDescription('Could not set diamond amount. Original amount restored.')
                        .setFooter({ text: 'Developer Commands • User Management' })
                        .setTimestamp();

                    return interaction.editReply({ embeds: [embed] });
                }
            }

            const newDiamonds = await EconomyService.getDiamonds(target.id);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('💎 Diamonds Set')
                .setDescription(`Successfully set ${target.displayName}'s diamonds to **${amount.toLocaleString()}**.`)
                .addFields(
                    { name: 'Diamond Balance', value: `💎 ${oldDiamonds.toLocaleString()} → ${newDiamonds.toLocaleString()}`, inline: true }
                )
                .setThumbnail(target.displayAvatarURL())
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error setting diamonds:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Error')
                .setDescription('An error occurred while setting diamonds.')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    // Item management methods (existing but enhanced)
    private async handleItemGive(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('user', true);
        const itemId = interaction.options.getString('item-id', true);
        const quantity = interaction.options.getInteger('quantity') || 1;

        try {
            const item = await EconomyItem.findOne({ itemId });
            if (!item) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err as ColorResolvable)
                    .setTitle('❌ Item Not Found')
                    .setDescription(`No item found with ID: \`${itemId}\``)
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const success = await EconomyService.addItem(target.id, itemId, quantity, 0);

            if (!success) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err as ColorResolvable)
                    .setTitle('❌ Failed to Give Item')
                    .setDescription('Could not add item to user inventory.')
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('🎁 Item Given')
                .setDescription(`Successfully gave **${quantity}x ${item.emoji} ${item.name}** to ${target.displayName}.`)
                .addFields(
                    { name: 'Item Details', value: `**Name:** ${item.name}\n**Category:** ${item.category}\n**Rarity:** ${this.getRarityDisplay(item.rarity)}\n**ID:** \`${itemId}\``, inline: true },
                    { name: 'Developer Action', value: `Given by: ${interaction.user.tag}\nQuantity: ${quantity}`, inline: true }
                )
                .setThumbnail(target.displayAvatarURL())
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            if (item.image) {
                embed.setImage(item.image);
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error giving item:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Error')
                .setDescription('An error occurred while giving the item.')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private async handleItemTake(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('user', true);
        const itemId = interaction.options.getString('item-id', true);
        const quantity = interaction.options.getInteger('quantity') || 1;

        try {
            const item = await EconomyItem.findOne({ itemId });
            if (!item) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err as ColorResolvable)
                    .setTitle('❌ Item Not Found')
                    .setDescription(`No item found with ID: \`${itemId}\``)
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const success = await EconomyService.removeItem(target.id, itemId, quantity);

            if (!success) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err as ColorResolvable)
                    .setTitle('❌ Failed to Take Item')
                    .setDescription('Could not remove item from user inventory. They may not have enough of this item.')
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('🔄 Item Taken')
                .setDescription(`Successfully took **${quantity}x ${item.emoji} ${item.name}** from ${target.displayName}.`)
                .addFields(
                    { name: 'Item Details', value: `**Name:** ${item.name}\n**Category:** ${item.category}\n**Rarity:** ${this.getRarityDisplay(item.rarity)}\n**ID:** \`${itemId}\``, inline: true },
                    { name: 'Developer Action', value: `Taken by: ${interaction.user.tag}\nQuantity: ${quantity}`, inline: true }
                )
                .setThumbnail(target.displayAvatarURL())
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error taking item:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Error')
                .setDescription('An error occurred while taking the item.')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private async handleItemClear(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('user', true);
        const category = interaction.options.getString('category');

        try {
            const user = await User.findOne({ userId: target.id });
            if (!user) {
                await EconomyService.getUser(target.id, target.username); // Create user
                const newUser = await User.findOne({ userId: target.id });
                if (!newUser) throw new Error('Failed to create user');
            }

            const userToUpdate = await User.findOne({ userId: target.id });
            if (!userToUpdate) throw new Error('User not found');

            const beforeCount = userToUpdate.economy.inventory.length;
            let clearedItems = 0;

            if (category) {
                // Clear specific category
                const originalLength = userToUpdate.economy.inventory.length;
                userToUpdate.economy.inventory = userToUpdate.economy.inventory.filter(item => item.category !== category);
                clearedItems = originalLength - userToUpdate.economy.inventory.length;
            } else {
                // Clear all items
                clearedItems = userToUpdate.economy.inventory.length;
                userToUpdate.economy.inventory = [];
            }

            await userToUpdate.save();

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('🗑️ Inventory Cleared')
                .setDescription(`Successfully cleared ${category ? `**${category}** items` : 'all items'} from ${target.displayName}'s inventory.`)
                .addFields(
                    { name: 'Items Cleared', value: `${clearedItems} items removed`, inline: true },
                    { name: 'Remaining Items', value: `${userToUpdate.economy.inventory.length} items left`, inline: true }
                )
                .setThumbnail(target.displayAvatarURL())
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error clearing inventory:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Error')
                .setDescription('An error occurred while clearing the inventory.')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    // Profile management methods (existing but enhanced)
    private async handleProfileReset(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('user', true);
        const confirm = interaction.options.getBoolean('confirm', true);

        if (!confirm) {
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.warn as ColorResolvable)
                .setTitle('❌ Reset Cancelled')
                .setDescription('Profile reset was cancelled. Set confirm to true to proceed.')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        try {
            const user = await User.findOne({ userId: target.id });
            if (!user) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err as ColorResolvable)
                    .setTitle('❌ User Not Found')
                    .setDescription(`${target.displayName} has no economy profile to reset.`)
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            // Reset economy data to defaults
            user.economy.wallet = 1000;
            user.economy.bank = 0;
            user.economy.bankLimit = 10000;
            user.economy.level = 1;
            user.economy.experience = 0;
            user.economy.dailyStreak = 0;
            user.economy.lastDaily = null;
            user.economy.lastWork = null;
            user.economy.inventory = [];
            user.economy.transactions = [];

            await user.save();

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('🔄 Profile Reset Complete')
                .setDescription(`Successfully reset ${target.displayName}'s economy profile to default values.`)
                .addFields({
                    name: 'Reset Values',
                    value: [
                        '💰 Wallet: 1,000 coins',
                        '🏦 Bank: 0 coins',
                        '📊 Bank Limit: 10,000 coins',
                        '⭐ Level: 1',
                        '✨ Experience: 0',
                        '🔥 Daily Streak: 0',
                        '📦 Inventory: Cleared',
                        '💎 Diamonds: 0'
                    ].join('\n'),
                    inline: false
                })
                .setThumbnail(target.displayAvatarURL())
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error resetting profile:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Error')
                .setDescription('An error occurred while resetting the profile.')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private async handleProfileView(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('user', true);

        try {
            const user = await EconomyService.getUser(target.id, target.username);
            const diamonds = await EconomyService.getDiamonds(target.id);
            const totalValue = user.economy.inventory.reduce((sum, item) => 
                sum + (item.purchasePrice || 0) * item.quantity, 0
            );

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle(`👤 ${target.displayName}'s Economy Profile`)
                .setDescription('Complete developer view of user economy data')
                .addFields(
                    {
                        name: '💰 Money',
                        value: [
                            `💸 Wallet: ${user.economy.wallet.toLocaleString()} coins`,
                            `🏦 Bank: ${user.economy.bank.toLocaleString()} coins`,
                            `📊 Bank Limit: ${user.economy.bankLimit.toLocaleString()} coins`,
                            `💎 Diamonds: ${diamonds.toLocaleString()}`,
                            `📈 Total: ${(user.economy.wallet + user.economy.bank).toLocaleString()} coins`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '📊 Progress',
                        value: [
                            `⭐ Level: ${user.economy.level}`,
                            `✨ Experience: ${user.economy.experience.toLocaleString()}`,
                            `🔥 Daily Streak: ${user.economy.dailyStreak} days`,
                            `📅 Last Daily: ${user.economy.lastDaily ? new Date(user.economy.lastDaily).toLocaleDateString() : 'Never'}`,
                            `⚒️ Last Work: ${user.economy.lastWork ? new Date(user.economy.lastWork).toLocaleDateString() : 'Never'}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '📦 Inventory',
                        value: [
                            `📦 Unique Items: ${user.economy.inventory.length}`,
                            `💵 Total Value: ${totalValue.toLocaleString()} coins`,
                            `🏆 Most Valuable: ${this.getMostValuableItem(user.economy.inventory)}`,
                            `📈 Transactions: ${user.economy.transactions.length}`
                        ].join('\n'),
                        inline: false
                    }
                )
                .setThumbnail(target.displayAvatarURL())
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error viewing profile:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Error')
                .setDescription('An error occurred while viewing the profile.')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    // Autocomplete for item IDs
    public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
        const focusedOption = interaction.options.getFocused(true);
        
        if (focusedOption.name === 'item-id') {
            try {
                const searchTerm = focusedOption.value.toLowerCase();
                const items = await EconomyItem.find({
                    $or: [
                        { name: { $regex: searchTerm, $options: 'i' } },
                        { itemId: { $regex: searchTerm, $options: 'i' } }
                    ]
                }).limit(25);
                
                const choices = items.map(item => ({
                    name: `${item.emoji} ${item.name} (${item.itemId})`,
                    value: item.itemId
                }));

                return interaction.respond(choices);
            } catch (error) {
                console.error('Error in autocomplete:', error);
                return interaction.respond([]);
            }
        }

        return interaction.respond([]);
    }

    // Helper methods
    private getRarityDisplay(rarity: string): string {
        const rarityColors = {
            common: '⚪ Common',
            uncommon: '🟢 Uncommon',
            rare: '🔵 Rare',
            epic: '🟣 Epic',
            legendary: '🟡 Legendary',
            mythical: '🔴 Mythical',
            divine: '✨ Divine',
            cursed: '💀 Cursed'
        };
        return rarityColors[rarity as keyof typeof rarityColors] || rarity;
    }

    private getMostValuableItem(inventory: any[]): string {
        if (inventory.length === 0) return 'None';
        
        const valuable = inventory.reduce((prev, current) => {
            const prevValue = (prev.purchasePrice || 0) * prev.quantity;
            const currentValue = (current.purchasePrice || 0) * current.quantity;
            return currentValue > prevValue ? current : prev;
        });

        return `${valuable.name} (${((valuable.purchasePrice || 0) * valuable.quantity).toLocaleString()} coins)`;
    }
}
