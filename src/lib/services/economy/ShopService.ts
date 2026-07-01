import { User } from '../../../models/User';
import { EconomyItem as EconomyItemModel } from '../../../models/EconomyItem';
import { container } from '@sapphire/framework';
import { MoneyService } from './MoneyService';
import { InventoryService } from './InventoryService';

export class ShopService {
  static async getItemPrice(itemId: string, type: 'buy' | 'sell' = 'buy'): Promise<number> {
    try {
      const item = await EconomyItemModel.findOne({ itemId });
      if (!item || !item.basePrice) return 0;

      let price = item.basePrice;

      const rarityMultipliers: Record<string, number> = {
        common: 1,
        uncommon: 1.5,
        rare: 2.5,
        epic: 4,
        legendary: 7,
        mythical: 12,
        divine: 20,
        cursed: 15
      };

      price *= rarityMultipliers[item.rarity] || 1;

      if (type === 'buy') {
        const fluctuation = (Math.random() - 0.5) * 0.4;
        price *= (1 + fluctuation);
      } else {
        if (!item.sellable) return 0;
        price *= 0.7;
      }

      const finalPrice = Math.floor(price);
      return isNaN(finalPrice) ? 0 : finalPrice;
    } catch (error) {
      container.logger.error('Error calculating item price for', itemId, ':', error);
      return 0;
    }
  }

  static async purchaseItem(userId: string, itemId: string, quantity: number = 1): Promise<{ success: boolean; message: string; cost?: number }> {
    try {
      const user = await User.findOne({ userId });
      const item = await EconomyItemModel.findOne({ itemId });

      if (!user) return { success: false, message: 'User not found' };
      if (!item) return { success: false, message: 'Item not found' };
      if (!item.shop.available) return { success: false, message: 'Item not available in shop' };

      if (item.shop.stock !== -1 && item.shop.stock < quantity) {
        return { success: false, message: 'Insufficient stock' };
      }

      const unitPrice = await this.getItemPrice(itemId, 'buy');
      const totalCost = unitPrice * quantity;

      if (user.economy.wallet < totalCost) {
        return { success: false, message: 'Insufficient funds', cost: totalCost };
      }

      const moneyRemoved = await MoneyService.removeMoney(userId, totalCost, 'wallet', `Purchased ${quantity}x ${item.name}`);
      if (!moneyRemoved) return { success: false, message: 'Failed to process payment' };

      const itemAdded = await InventoryService.addItem(userId, itemId, quantity, unitPrice);
      if (!itemAdded) {
        await MoneyService.addMoney(userId, totalCost, 'wallet', 'Refund for failed purchase');
        return { success: false, message: 'Failed to add item to inventory' };
      }

      if (item.shop.stock !== -1) {
        item.shop.stock -= quantity;
        await item.save();
      }

      return { success: true, message: `Successfully purchased ${quantity}x ${item.name}`, cost: totalCost };
    } catch (error) {
      container.logger.error('Error purchasing item:', error);
      return { success: false, message: 'An error occurred during purchase' };
    }
  }

  static async sellItem(userId: string, itemName: string, quantity: number = 1): Promise<{
    success: boolean;
    message: string;
    earned?: number;
    item?: { name: string };
    totalValue?: number;
    newBalance?: number;
    remainingQuantity?: number;
  }> {
    try {
      const user = await User.findOne({ userId });
      if (!user) return { success: false, message: 'User not found' };

      const userItem = user.economy.inventory.find(inv =>
        inv.name.toLowerCase().includes(itemName.toLowerCase())
      );

      if (!userItem) return { success: false, message: 'You don\'t have this item' };
      if (userItem.quantity < quantity) return { success: false, message: 'Insufficient quantity' };
      if (!userItem.sellable) return { success: false, message: 'This item cannot be sold' };

      const unitPrice = await this.getItemPrice(userItem.itemId, 'sell');
      const totalEarned = unitPrice * quantity;

      const itemRemoved = await InventoryService.removeItem(userId, userItem.itemId, quantity);
      if (!itemRemoved) return { success: false, message: 'Failed to remove item' };

      await MoneyService.addMoney(userId, totalEarned, 'wallet', `Sold ${quantity}x ${userItem.name}`);

      const updatedUser = await User.findOne({ userId });
      const remainingItem = updatedUser?.economy.inventory.find(inv => inv.itemId === userItem.itemId);

      return {
        success: true,
        message: `Successfully sold ${quantity}x ${userItem.name}`,
        earned: totalEarned,
        item: { name: userItem.name },
        totalValue: totalEarned,
        newBalance: updatedUser?.economy.wallet || 0,
        remainingQuantity: remainingItem?.quantity || 0
      };
    } catch (error) {
      container.logger.error('Error selling item:', error);
      return { success: false, message: 'An error occurred during sale' };
    }
  }
}
