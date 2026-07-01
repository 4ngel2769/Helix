import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { container } from '@sapphire/framework';
import config from '../../../config';
import { UserService } from '../../../lib/services/economy/UserService';
import { DiamondService } from '../../../lib/services/economy/DiamondService';
import { User } from '../../../models/User';
import { getMostValuableItem } from './utils';

export async function handleProfileReset(interaction: Command.ChatInputCommandInteraction) {
  await interaction.deferReply();

  const target = interaction.options.getUser('user', true);
  const confirm = interaction.options.getBoolean('confirm', true);

  if (!confirm) {
    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.warn as any)
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
        .setColor(config.bot.embedColor.err as any)
        .setTitle('❌ User Not Found')
        .setDescription(`${target.displayName} has no economy profile to reset.`)
        .setFooter({ text: 'Developer Commands • User Management' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

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
      .setColor(config.bot.embedColor.success as any)
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
    container.logger.error('Error resetting profile:', error);

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.err as any)
      .setTitle('❌ Error')
      .setDescription('An error occurred while resetting the profile.')
      .setFooter({ text: 'Developer Commands • User Management' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}

export async function handleProfileView(interaction: Command.ChatInputCommandInteraction) {
  await interaction.deferReply();

  const target = interaction.options.getUser('user', true);

  try {
    const user = await UserService.getUser(target.id, target.username);
    const diamonds = await DiamondService.getDiamonds(target.id);
    const totalValue = user.economy.inventory.reduce((sum, item) =>
      sum + (item.purchasePrice || 0) * item.quantity, 0
    );

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.default as any)
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
            `🏆 Most Valuable: ${getMostValuableItem(user.economy.inventory)}`,
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
    container.logger.error('Error viewing profile:', error);

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.err as any)
      .setTitle('❌ Error')
      .setDescription('An error occurred while viewing the profile.')
      .setFooter({ text: 'Developer Commands • User Management' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}
