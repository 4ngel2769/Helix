import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { container } from '@sapphire/framework';
import config from '../../../config';
import { UserService } from '../../../lib/services/economy/UserService';
import { MoneyService } from '../../../lib/services/economy/MoneyService';
import { User } from '../../../models/User';

export async function handleMoneyAdd(interaction: Command.ChatInputCommandInteraction) {
  await interaction.deferReply();

  const target = interaction.options.getUser('user', true);
  const amount = interaction.options.getInteger('amount', true);
  const location = (interaction.options.getString('location') as 'wallet' | 'bank') || 'wallet';
  const reason = interaction.options.getString('reason') || `Money added by ${interaction.user.tag} (Developer)`;

  try {
    const success = await MoneyService.addMoney(target.id, amount, location, reason);

    if (!success) {
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor.err as any)
        .setTitle('❌ Failed to Add Money')
        .setDescription('Could not add money to user account.')
        .setFooter({ text: 'Developer Commands • User Management' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    const user = await UserService.getUser(target.id, target.username);

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.success as any)
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
    container.logger.error('Error adding money:', error);

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.err as any)
      .setTitle('❌ Error')
      .setDescription('An error occurred while adding money.')
      .setFooter({ text: 'Developer Commands • User Management' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}

export async function handleMoneyRemove(interaction: Command.ChatInputCommandInteraction) {
  await interaction.deferReply();

  const target = interaction.options.getUser('user', true);
  const amount = interaction.options.getInteger('amount', true);
  const location = (interaction.options.getString('location') as 'wallet' | 'bank') || 'wallet';
  const reason = interaction.options.getString('reason') || `Money removed by ${interaction.user.tag} (Developer)`;

  try {
    const success = await MoneyService.removeMoney(target.id, amount, location, reason);

    if (!success) {
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor.err as any)
        .setTitle('❌ Failed to Remove Money')
        .setDescription('Could not remove money from user account. They may not have enough funds.')
        .setFooter({ text: 'Developer Commands • User Management' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    const user = await UserService.getUser(target.id, target.username);

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.success as any)
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
    container.logger.error('Error removing money:', error);

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.err as any)
      .setTitle('❌ Error')
      .setDescription('An error occurred while removing money.')
      .setFooter({ text: 'Developer Commands • User Management' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}

export async function handleMoneySet(interaction: Command.ChatInputCommandInteraction) {
  await interaction.deferReply();

  const target = interaction.options.getUser('user', true);
  const walletAmount = interaction.options.getInteger('wallet');
  const bankAmount = interaction.options.getInteger('bank');
  const bankLimit = interaction.options.getInteger('bank-limit');

  if (walletAmount === null && bankAmount === null && bankLimit === null) {
    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.err as any)
      .setTitle('❌ Invalid Input')
      .setDescription('You must specify at least one value to set (wallet, bank, or bank-limit).')
      .setFooter({ text: 'Developer Commands • User Management' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  try {
    const userToUpdate = await User.findOne({ userId: target.id });
    if (!userToUpdate) {
      await UserService.getUser(target.id, target.username);
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
      .setColor(config.bot.embedColor.success as any)
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
    container.logger.error('Error setting money:', error);

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.err as any)
      .setTitle('❌ Error')
      .setDescription('An error occurred while setting money values.')
      .setFooter({ text: 'Developer Commands • User Management' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}
