import { User } from '../../../models/User';
import { EconomyItem as EconomyItemModel } from '../../../models/EconomyItem';
import { container } from '@sapphire/framework';
import { InventoryService } from './InventoryService';

export class DiamondService {
  static async addDiamonds(userId: string, amount: number, reason: string = 'Unknown'): Promise<boolean> {
    try {
      let diamondItem = await EconomyItemModel.findOne({ itemId: 'diamond' });

      if (!diamondItem) {
        diamondItem = new EconomyItemModel({
          itemId: 'diamond',
          name: 'Diamond',
          description: 'A rare and precious gemstone used for special upgrades.',
          category: 'currencies',
          rarity: 'legendary',
          basePrice: 10000,
          emoji: '💎',
          tradeable: true,
          sellable: false,
          consumable: false,
          stackable: true,
          maxStack: 999,
          shop: {
            available: false,
            category: 'premium'
          }
        });

        await diamondItem.save();
      }

      return await InventoryService.addItem(userId, 'diamond', amount, 0);
    } catch (error) {
      container.logger.error('Error adding diamonds:', error);
      return false;
    }
  }

  static async getDiamonds(userId: string): Promise<number> {
    try {
      const user = await User.findOne({ userId });
      if (!user) return 0;

      const diamondItem = user.economy.inventory.find(item =>
        item.itemId === 'diamond' || item.name.toLowerCase().includes('diamond')
      );

      return diamondItem ? diamondItem.quantity : 0;
    } catch (error) {
      container.logger.error('Error getting diamonds:', error);
      return 0;
    }
  }
}
