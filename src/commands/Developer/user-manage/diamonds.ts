import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { container } from '@sapphire/framework';
import config from '../../../config';
import { DiamondService } from '../../../lib/services/economy/DiamondService';
import { UserService } from '../../../lib/services/economy/UserService';

export async function handleDiamondsAdd(interaction: Command.ChatInputCommandInteraction) {
  await interaction.deferReply();

  const target = interaction.options.getUser('user', true);
  const amount = interaction.options.getInteger('amount', true);
  const reason = interaction.options.getString('reason') || `Diamonds added by ${interaction.user.tag} (Developer)`;

  try {
    const oldDiamonds = await DiamondService.getDiamonds(target.id);
    const success = await DiamondService.addDiamonds(target.id, amount, reason);

    if (!success) {
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor.err as any)
        .setTitle('❌ Failed to Add Diamonds')
        .setDescription('Could not add diamonds to user account.')
        .setFooter({ text: 'Developer Commands • User Management' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    const newDiamonds = await DiamondService.getDiamonds(target.id);

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.success as any)
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
    container.logger.error('Error adding diamonds:', error);

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.err as any)
      .setTitle('❌ Error')
      .setDescription('An error occurred while adding diamonds.')
      .setFooter({ text: 'Developer Commands • User Management' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}

export async function handleDiamondsRemove(interaction: Command.ChatInputCommandInteraction) {
  await interaction.deferReply();

  const target = interaction.options.getUser('user', true);
  const amount = interaction.options.getInteger('amount', true);
  const reason = interaction.options.getString('reason') || `Diamonds removed by ${interaction.user.tag} (Developer)`;

  try {
    const oldDiamonds = await DiamondService.getDiamonds(target.id);
    const success = await DiamondService.addDiamonds(target.id, -amount, reason);

    if (!success) {
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor.err as any)
        .setTitle('❌ Failed to Remove Diamonds')
        .setDescription('Could not remove diamonds from user account. They may not have enough.')
        .setFooter({ text: 'Developer Commands • User Management' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    const newDiamonds = await DiamondService.getDiamonds(target.id);

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.success as any)
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
    container.logger.error('Error removing diamonds:', error);

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.err as any)
      .setTitle('❌ Error')
      .setDescription('An error occurred while removing diamonds.')
      .setFooter({ text: 'Developer Commands • User Management' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}

export async function handleDiamondsSet(interaction: Command.ChatInputCommandInteraction) {
  await interaction.deferReply();

  const target = interaction.options.getUser('user', true);
  const amount = interaction.options.getInteger('amount', true);
  const reason = interaction.options.getString('reason') || `Diamonds set by ${interaction.user.tag} (Developer)`;

  try {
    const oldDiamonds = await DiamondService.getDiamonds(target.id);

    const user = await UserService.getUser(target.id, target.username);
    const diamondItem = user.economy.inventory.find(item =>
      item.itemId === 'diamond' || item.name.toLowerCase().includes('diamond')
    );

    if (diamondItem) {
      diamondItem.quantity = amount;
      await user.save();
    } else if (amount > 0) {
      await DiamondService.addDiamonds(target.id, amount, reason);
    }

    const newDiamonds = await DiamondService.getDiamonds(target.id);

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.success as any)
      .setTitle('💎 Diamonds Set')
      .setDescription(`Successfully set ${target.displayName}'s diamonds to **${amount.toLocaleString()}**.`)
      .addFields(
        { name: 'Diamond Balance', value: `💎 ${oldDiamonds.toLocaleString()} → ${newDiamonds.toLocaleString()}`, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setThumbnail(target.displayAvatarURL())
      .setFooter({ text: 'Developer Commands • User Management' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (error) {
    container.logger.error('Error setting diamonds:', error);

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.err as any)
      .setTitle('❌ Error')
      .setDescription('An error occurred while setting diamonds.')
      .setFooter({ text: 'Developer Commands • User Management' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}
