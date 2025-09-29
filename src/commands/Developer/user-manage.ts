import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
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
                    .setColor(config.bot.embedColor.err)
                    .setTitle('❌ Failed to Add Money')
                    .setDescription('Could not add money to the user. They may not have an economy profile.')
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const user = await EconomyService.getUser(target.id, target.username);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success)
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
                .setColor(config.bot.embedColor.err)
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
                    .setColor(config.bot.embedColor.err)
                    .setTitle('❌ Failed to Remove Money')
                    .setDescription('Could not remove money from the user. They may not have enough funds or an economy profile.')
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const user = await EconomyService.getUser(target.id, target.username);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success)
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
                .setColor(config.bot.embedColor.err)
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
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Invalid Input')
                .setDescription('You must specify at least one value to set (wallet, bank, or bank-limit).')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        try {
            const user = await User.findOne({ userId: target.id });
            if (!user) {
                await EconomyService.getUser(target.id, target.username);
                const newUser = await User.findOne({ userId: target.id });
                if (!newUser) throw new Error('Failed to create user');
            }

            const userToUpdate = await User.findOne({ userId: target.id });
            if (!userToUpdate) throw new Error('User not found');

            const oldWallet = userToUpdate.economy.wallet;
            const oldBank = userToUpdate.economy.bank;
            const oldBankLimit = userToUpdate.economy.bankLimit;

            if (walletAmount !== null) userToUpdate.economy.wallet = walletAmount;
            if (bankAmount !== null) userToUpdate.economy.bank = bankAmount;
            if (bankLimit !== null) userToUpdate.economy.bankLimit = bankLimit;

            await userToUpdate.save();

            const changes: string[] = [];
            if (walletAmount !== null) changes.push(`💰 Wallet: ${oldWallet.toLocaleString()} → ${walletAmount.toLocaleString()}`);
            if (bankAmount !== null) changes.push(`🏦 Bank: ${oldBank.toLocaleString()} → ${bankAmount.toLocaleString()}`);
            if (bankLimit !== null) changes.push(`📊 Bank Limit: ${oldBankLimit.toLocaleString()} → ${bankLimit.toLocaleString()}`);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success)
                .setTitle('⚙️ Economy Values Updated')
                .setDescription(`Successfully updated ${target.displayName}'s economy data.`)
                .addFields(
                    { name: 'Changes Made', value: changes.join('\n'), inline: false },
                    { name: 'Current Balance', value: `💰 Wallet: ${userToUpdate.economy.wallet.toLocaleString()}\n🏦 Bank: ${userToUpdate.economy.bank.toLocaleString()}/${userToUpdate.economy.bankLimit.toLocaleString()}`, inline: true }
                )
                .setThumbnail(target.displayAvatarURL())
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error setting money:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while setting money values.')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private async handleItemGive(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('user', true);
        const itemId = interaction.options.getString('item-id', true);
        const quantity = interaction.options.getInteger('quantity') || 1;

        try {
            const item = await EconomyItem.findOne({ itemId });
            if (!item) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err)
                    .setTitle('❌ Item Not Found')
                    .setDescription(`No item found with ID: \`${itemId}\``)
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const success = await EconomyService.addItem(target.id, itemId, quantity, 0);

            if (!success) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err)
                    .setTitle('❌ Failed to Give Item')
                    .setDescription('Could not add the item to the user\'s inventory.')
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success)
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
                .setColor(config.bot.embedColor.err)
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
                    .setColor(config.bot.embedColor.err)
                    .setTitle('❌ Item Not Found')
                    .setDescription(`No item found with ID: \`${itemId}\``)
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const success = await EconomyService.removeItem(target.id, itemId, quantity);

            if (!success) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err)
                    .setTitle('❌ Failed to Take Item')
                    .setDescription('Could not remove the item from the user\'s inventory. They may not have enough of this item.')
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success)
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
                .setColor(config.bot.embedColor.err)
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
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err)
                    .setTitle('❌ User Not Found')
                    .setDescription(`${target.displayName} doesn't have an economy profile.`)
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const beforeCount = user.economy.inventory.length;
            let clearedItems = 0;

            if (category) {
                const itemsToRemove = user.economy.inventory.filter(item => item.category === category);
                clearedItems = itemsToRemove.length;
                user.economy.inventory = user.economy.inventory.filter(item => item.category !== category);
            } else {
                clearedItems = user.economy.inventory.length;
                user.economy.inventory = [];
            }

            await user.save();

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success)
                .setTitle('🗑️ Inventory Cleared')
                .setDescription(`Successfully cleared ${target.displayName}'s inventory${category ? ` for category: ${category}` : ''}.`)
                .addFields(
                    { name: 'Items Removed', value: clearedItems.toString(), inline: true },
                    { name: 'Items Remaining', value: user.economy.inventory.length.toString(), inline: true },
                    { name: 'Developer Action', value: `Cleared by: ${interaction.user.tag}`, inline: false }
                )
                .setThumbnail(target.displayAvatarURL())
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error clearing inventory:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while clearing the inventory.')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private async handleProfileReset(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('user', true);
        const confirm = interaction.options.getBoolean('confirm', true);

        if (!confirm) {
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.warn)
                .setTitle('⚠️ Reset Cancelled')
                .setDescription('You must confirm the reset by setting the confirm option to true.')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        try {
            await User.deleteOne({ userId: target.id });

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success)
                .setTitle('🔄 Profile Reset')
                .setDescription(`Successfully reset ${target.displayName}'s economy profile. They will start fresh with default values on their next economy command.`)
                .addFields(
                    { name: 'Developer Action', value: `Reset by: ${interaction.user.tag}\nTimestamp: <t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                )
                .setThumbnail(target.displayAvatarURL())
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error resetting profile:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
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
            const user = await User.findOne({ userId: target.id });
            if (!user) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.warn)
                    .setTitle('❌ No Profile Found')
                    .setDescription(`${target.displayName} doesn't have an economy profile yet.`)
                    .setFooter({ text: 'Developer Commands • User Management' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const totalValue = user.economy.wallet + user.economy.bank;
            const itemCount = user.economy.inventory.reduce((sum, item) => sum + item.quantity, 0);
            const uniqueItems = user.economy.inventory.length;

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default)
                .setTitle(`🔧 ${target.displayName}'s Economy Profile`)
                .setDescription('**Developer View** - Complete user economy data')
                .addFields(
                    { name: '💰 Money', value: `**Wallet:** ${user.economy.wallet.toLocaleString()}\n**Bank:** ${user.economy.bank.toLocaleString()}/${user.economy.bankLimit.toLocaleString()}\n**Total:** ${totalValue.toLocaleString()}`, inline: true },
                    { name: '📦 Inventory', value: `**Items:** ${itemCount}\n**Unique:** ${uniqueItems}\n**Categories:** ${new Set(user.economy.inventory.map(i => i.category)).size}`, inline: true },
                    { name: '⭐ Progress', value: `**Level:** ${user.economy.level}\n**Experience:** ${user.economy.experience}\n**Daily Streak:** ${user.economy.dailyStreak}`, inline: true },
                    { name: '📈 Activity', value: `**Last Daily:** ${user.economy.lastDaily ? `<t:${Math.floor(user.economy.lastDaily.getTime() / 1000)}:R>` : 'Never'}\n**Last Work:** ${user.economy.lastWork ? `<t:${Math.floor(user.economy.lastWork.getTime() / 1000)}:R>` : 'Never'}\n**Last Seen:** <t:${Math.floor(user.lastSeen.getTime() / 1000)}:R>`, inline: true },
                    { name: '⚙️ Settings', value: `**DMs on Auction:** ${user.economy.settings.dmsOnAuction ? 'Enabled' : 'Disabled'}\n**Auto Deposit:** ${user.economy.settings.autoDeposit ? 'Enabled' : 'Disabled'}\n**Public Profile:** ${user.economy.settings.publicProfile ? 'Public' : 'Private'}`, inline: true },
                    { name: '🏷️ User Info', value: `**ID:** \`${user.userId}\`\n**Username:** ${user.username}\n**Servers:** ${user.joinedServers.length}`, inline: true },
                    { name: '🔧 Developer Info', value: `**Transactions:** ${user.economy.transactions.length}\n**Profile Created:** ${user.createdAt ? `<t:${Math.floor(user.createdAt.getTime() / 1000)}:R>` : 'Unknown'}\n**Requested by:** ${interaction.user.tag}`, inline: false }
                )
                .setThumbnail(target.displayAvatarURL())
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error viewing profile:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while viewing the profile.')
                .setFooter({ text: 'Developer Commands • User Management' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private getRarityDisplay(rarity: string): string {
        const rarityColors = {
            common: '⚪ Common',
            uncommon: '🟢 Uncommon',
            rare: '🔵 Rare',
            epic: '🟣 Epic',
            legendary: '🟡 Legendary',
            mythical: '🔴 Mythical'
        };
        return rarityColors[rarity as keyof typeof rarityColors] || rarity;
    }
}
