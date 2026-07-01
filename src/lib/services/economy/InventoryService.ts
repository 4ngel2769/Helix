import { User, type EconomyItem } from '../../../models/User';
import { EconomyItem as EconomyItemModel } from '../../../models/EconomyItem';
import { container } from '@sapphire/framework';

export class InventoryService {
  static async getInventory(userId: string, category?: string): Promise<EconomyItem[]> {
    try {
      const user = await User.findOne({ userId });
      if (!user) return [];

      let inventory = user.economy.inventory;

      if (category && category !== 'all') {
        inventory = inventory.filter(item => item.category === category);
      }

      return inventory;
    } catch (error) {
      container.logger.error('Error getting inventory:', error);
      return [];
    }
  }

  static async getUserInventory(userId: string, category?: string): Promise<{ success: boolean; inventory?: (EconomyItem & { sellPrice: number })[]; message?: string }> {
    try {
      const user = await User.findOne({ userId });
      if (!user) return { success: true, inventory: [] };

      let inventory = user.economy.inventory;

      if (category && category !== 'all') {
        inventory = inventory.filter(item => item.category === category);
      }

      const itemIds = [...new Set(inventory.map((item) => item.itemId))];
      const economyItems = await EconomyItemModel.find({ itemId: { $in: itemIds } });
      const economyItemMap = new Map(economyItems.map((item) => [item.itemId, item]));

      const inventoryWithPrices = inventory.map((invItem) => {
        const economyItem = economyItemMap.get(invItem.itemId);

        if (!economyItem) {
          container.logger.warn(`Item ${invItem.itemId} not found in EconomyItem collection`);
          return {
            ...invItem,
            name: invItem.name || 'Unknown Item',
            sellPrice: 0,
            sellable: false,
            quantity: Number(invItem.quantity) || 0
          };
        }

        let sellPrice = 0;
        if (economyItem.sellable) {
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

          const basePrice = economyItem.basePrice || 0;
          const rarityMultiplier = rarityMultipliers[economyItem.rarity] || 1;
          sellPrice = Math.floor(basePrice * rarityMultiplier * 0.7);
        }

        return {
          ...invItem,
          itemId: economyItem.itemId,
          name: economyItem.name,
          description: economyItem.description,
          category: economyItem.category,
          rarity: economyItem.rarity,
          sellable: economyItem.sellable,
          emoji: economyItem.emoji,
          image: economyItem.image,
          quantity: Number(invItem.quantity) || 0,
          purchasePrice: Number(invItem.purchasePrice) || 0,
          sellPrice
        };
      });

      const validInventory = inventoryWithPrices.filter(item => item.quantity > 0);

      return { success: true, inventory: validInventory };
    } catch (error) {
      container.logger.error('Error getting user inventory:', error);
      return { success: false, message: 'Failed to retrieve inventory' };
    }
  }

  static async addItem(userId: string, itemId: string, quantity: number, purchasePrice: number = 0): Promise<boolean> {
    try {
      const economyItem = await EconomyItemModel.findOne({ itemId });
      if (!economyItem) {
        container.logger.error(`Item ${itemId} not found in EconomyItem collection`);
        return false;
      }

      const user = await User.findOne({ userId });
      if (!user) return false;

      const existingItemIndex = user.economy.inventory.findIndex(item => item.itemId === itemId);

      if (existingItemIndex !== -1) {
        user.economy.inventory[existingItemIndex].quantity += quantity;
      } else {
        const newInventoryItem = {
          itemId: economyItem.itemId,
          name: economyItem.name,
          description: economyItem.description,
          category: economyItem.category,
          rarity: economyItem.rarity,
          sellable: economyItem.sellable,
          emoji: economyItem.emoji,
          quantity: quantity,
          purchasePrice: purchasePrice,
          acquiredAt: new Date(),
          purchaseDate: new Date(),
          tradeable: economyItem.tradeable ?? false
        };

        user.economy.inventory.push(newInventoryItem);
      }

      await user.save();
      return true;
    } catch (error) {
      container.logger.error('Error adding item to inventory:', error);
      return false;
    }
  }

  static async removeItem(userId: string, itemId: string, quantity: number = 1): Promise<boolean> {
    try {
      const user = await User.findOne({ userId });
      if (!user) return false;

      const itemIndex = user.economy.inventory.findIndex(inv => inv.itemId === itemId);
      if (itemIndex === -1) return false;

      const item = user.economy.inventory[itemIndex];
      if (item.quantity < quantity) return false;

      item.quantity -= quantity;

      if (item.quantity <= 0) {
        user.economy.inventory.splice(itemIndex, 1);
      }

      await user.save();
      return true;
    } catch (error) {
      container.logger.error('Error removing item:', error);
      return false;
    }
  }

  static async refreshUserInventory(userId: string): Promise<boolean> {
    try {
      const user = await User.findOne({ userId });
      if (!user) return false;

      const itemIds = [...new Set(user.economy.inventory.map((item) => item.itemId))];
      const economyItems = await EconomyItemModel.find({ itemId: { $in: itemIds } });
      const economyItemMap = new Map(economyItems.map((item) => [item.itemId, item]));

      const refreshedInventory = user.economy.inventory.map((invItem) => {
        const economyItem = economyItemMap.get(invItem.itemId);

        if (economyItem) {
          return {
            ...invItem,
            name: economyItem.name,
            description: economyItem.description,
            category: economyItem.category,
            rarity: economyItem.rarity,
            sellable: economyItem.sellable,
            emoji: economyItem.emoji
          };
        }

        return invItem;
      });

      user.economy.inventory = refreshedInventory;
      await user.save();

      return true;
    } catch (error) {
      container.logger.error('Error refreshing user inventory:', error);
      return false;
    }
  }
}
