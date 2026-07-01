import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { container } from '@sapphire/framework';
import config from '../../../config';
import { UserService } from '../../../lib/services/economy/UserService';
import { InventoryService } from '../../../lib/services/economy/InventoryService';
import { EconomyItem } from '../../../models/EconomyItem';
import { User } from '../../../models/User';
import { getRarityDisplay } from './_utils';

export async function handleItemGive(interaction: Command.ChatInputCommandInteraction) {
  await interaction.deferReply();

  const target = interaction.options.getUser('user', true);
  const itemId = interaction.options.getString('item-id', true);
  const quantity = interaction.options.getInteger('quantity') || 1;

  try {
    const item = await EconomyItem.findOne({ itemId });
    if (!item) {
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor.err as any)
        .setTitle('❌ Item Not Found')
        .setDescription(`No item found with ID: \`${itemId}\``)
        .setFooter({ text: 'Developer Commands • User Management' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    const success = await InventoryService.addItem(target.id, itemId, quantity, 0);

    if (!success) {
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor.err as any)
        .setTitle('❌ Failed to Give Item')
        .setDescription('Could not add item to user inventory.')
        .setFooter({ text: 'Developer Commands • User Management' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.success as any)
      .setTitle('🎁 Item Given')
      .setDescription(`Successfully gave **${quantity}x ${item.emoji} ${item.name}** to ${target.displayName}.`)
      .addFields(
        { name: 'Item Details', value: `**Name:** ${item.name}\n**Category:** ${item.category}\n**Rarity:** ${getRarityDisplay(item.rarity)}\n**ID:** \`${itemId}\``, inline: true },
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
    container.logger.error('Error giving item:', error);

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.err as any)
      .setTitle('❌ Error')
      .setDescription('An error occurred while giving the item.')
      .setFooter({ text: 'Developer Commands • User Management' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}

export async function handleItemTake(interaction: Command.ChatInputCommandInteraction) {
  await interaction.deferReply();

  const target = interaction.options.getUser('user', true);
  const itemId = interaction.options.getString('item-id', true);
  const quantity = interaction.options.getInteger('quantity') || 1;

  try {
    const item = await EconomyItem.findOne({ itemId });
    if (!item) {
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor.err as any)
        .setTitle('❌ Item Not Found')
        .setDescription(`No item found with ID: \`${itemId}\``)
        .setFooter({ text: 'Developer Commands • User Management' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    const success = await InventoryService.removeItem(target.id, itemId, quantity);

    if (!success) {
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor.err as any)
        .setTitle('❌ Failed to Take Item')
        .setDescription('Could not remove item from user inventory. They may not have enough of this item.')
        .setFooter({ text: 'Developer Commands • User Management' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.success as any)
      .setTitle('🔄 Item Taken')
      .setDescription(`Successfully took **${quantity}x ${item.emoji} ${item.name}** from ${target.displayName}.`)
      .addFields(
        { name: 'Item Details', value: `**Name:** ${item.name}\n**Category:** ${item.category}\n**Rarity:** ${getRarityDisplay(item.rarity)}\n**ID:** \`${itemId}\``, inline: true },
        { name: 'Developer Action', value: `Taken by: ${interaction.user.tag}\nQuantity: ${quantity}`, inline: true }
      )
      .setThumbnail(target.displayAvatarURL())
      .setFooter({ text: 'Developer Commands • User Management' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (error) {
    container.logger.error('Error taking item:', error);

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.err as any)
      .setTitle('❌ Error')
      .setDescription('An error occurred while taking the item.')
      .setFooter({ text: 'Developer Commands • User Management' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}

export async function handleItemClear(interaction: Command.ChatInputCommandInteraction) {
  await interaction.deferReply();

  const target = interaction.options.getUser('user', true);
  const category = interaction.options.getString('category');

  try {
    const user = await User.findOne({ userId: target.id });
    if (!user) {
      await UserService.getUser(target.id, target.username);
      const newUser = await User.findOne({ userId: target.id });
      if (!newUser) throw new Error('Failed to create user');
    }

    const userToUpdate = await User.findOne({ userId: target.id });
    if (!userToUpdate) throw new Error('User not found');

    const beforeCount = userToUpdate.economy.inventory.length;
    let clearedItems = 0;

    if (category) {
      const originalLength = userToUpdate.economy.inventory.length;
      userToUpdate.economy.inventory = userToUpdate.economy.inventory.filter(item => item.category !== category);
      clearedItems = originalLength - userToUpdate.economy.inventory.length;
    } else {
      clearedItems = userToUpdate.economy.inventory.length;
      userToUpdate.economy.inventory = [];
    }

    await userToUpdate.save();

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.success as any)
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
    container.logger.error('Error clearing inventory:', error);

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.err as any)
      .setTitle('❌ Error')
      .setDescription('An error occurred while clearing the inventory.')
      .setFooter({ text: 'Developer Commands • User Management' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}
