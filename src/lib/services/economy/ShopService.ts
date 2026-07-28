import mongoose from 'mongoose';
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
    const session = await mongoose.startSession();
    let result: { success: boolean; message: string; cost?: number } = { success: false, message: 'An error occurred during purchase' };

    try {
      await session.withTransaction(async () => {
        const user = await User.findOne({ userId }, null, { session });
        const item = await EconomyItemModel.findOne({ itemId }, null, { session });

        if (!user) {
          result = { success: false, message: 'User not found' };
          throw new Error('User not found');
        }
        if (!item) {
          result = { success: false, message: 'Item not found' };
          throw new Error('Item not found');
        }
        if (!item.shop.available) {
          result = { success: false, message: 'Item not available in shop' };
          throw new Error('Item not available in shop');
        }

        if (item.shop.stock !== -1 && item.shop.stock < quantity) {
          result = { success: false, message: 'Insufficient stock' };
          throw new Error('Insufficient stock');
        }

        const unitPrice = await this.getItemPrice(itemId, 'buy');
        const totalCost = unitPrice * quantity;

        if (user.economy.wallet < totalCost) {
          result = { success: false, message: 'Insufficient funds', cost: totalCost };
          throw new Error('Insufficient funds');
        }

        const moneyRemoved = await MoneyService.removeMoney(userId, totalCost, 'wallet', `Purchased ${quantity}x ${item.name}`, session);
        if (!moneyRemoved) {
          result = { success: false, message: 'Failed to process payment' };
          throw new Error('Failed to process payment');
        }

        const itemAdded = await InventoryService.addItem(userId, itemId, quantity, unitPrice, session);
        if (!itemAdded) {
          result = { success: false, message: 'Failed to add item to inventory' };
          throw new Error('Failed to add item to inventory');
        }

        if (item.shop.stock !== -1) {
          item.shop.stock -= quantity;
          await item.save({ session });
        }

        result = { success: true, message: `Successfully purchased ${quantity}x ${item.name}`, cost: totalCost };
      });
      return result;
    } catch (error: any) {
      if (result.message && result.message !== 'An error occurred during purchase') {
        return result;
      }
      container.logger.error('Error purchasing item:', error);
      return { success: false, message: 'An error occurred during purchase' };
    } finally {
      await session.endSession();
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
    const session = await mongoose.startSession();
    let result: {
      success: boolean;
      message: string;
      earned?: number;
      item?: { name: string };
      totalValue?: number;
      newBalance?: number;
      remainingQuantity?: number;
    } = { success: false, message: 'An error occurred during sale' };

    try {
      await session.withTransaction(async () => {
        const user = await User.findOne({ userId }, null, { session });
        if (!user) {
          result = { success: false, message: 'User not found' };
          throw new Error('User not found');
        }

        const userItem = user.economy.inventory.find(inv =>
          inv.name.toLowerCase().includes(itemName.toLowerCase())
        );

        if (!userItem) {
          result = { success: false, message: 'You don\'t have this item' };
          throw new Error('Item not found');
        }
        if (userItem.quantity < quantity) {
          result = { success: false, message: 'Insufficient quantity' };
          throw new Error('Insufficient quantity');
        }
        if (!userItem.sellable) {
          result = { success: false, message: 'This item cannot be sold' };
          throw new Error('This item cannot be sold');
        }

        const unitPrice = await this.getItemPrice(userItem.itemId, 'sell');
        const totalEarned = unitPrice * quantity;

        const itemRemoved = await InventoryService.removeItem(userId, userItem.itemId, quantity, session);
        if (!itemRemoved) {
          result = { success: false, message: 'Failed to remove item' };
          throw new Error('Failed to remove item');
        }

        const moneyAdded = await MoneyService.addMoney(userId, totalEarned, 'wallet', `Sold ${quantity}x ${userItem.name}`, session);
        if (!moneyAdded) {
          result = { success: false, message: 'Failed to add money' };
          throw new Error('Failed to add money');
        }

        const updatedUser = await User.findOne({ userId }, null, { session });
        const remainingItem = updatedUser?.economy.inventory.find(inv => inv.itemId === userItem.itemId);

        result = {
          success: true,
          message: `Successfully sold ${quantity}x ${userItem.name}`,
          earned: totalEarned,
          item: { name: userItem.name },
          totalValue: totalEarned,
          newBalance: updatedUser?.economy.wallet || 0,
          remainingQuantity: remainingItem?.quantity || 0
        };
      });
      return result;
    } catch (error: any) {
      if (result.message && result.message !== 'An error occurred during sale') {
        return result;
      }
      container.logger.error('Error selling item:', error);
      return { success: false, message: 'An error occurred during sale' };
    } finally {
      await session.endSession();
    }
  }
}
