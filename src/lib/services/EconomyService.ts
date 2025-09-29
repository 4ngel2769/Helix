import { User, type IUser, type EconomyItem, type Transaction } from '../../models/User';
import { EconomyItem as EconomyItemModel, type IEconomyItem } from '../../models/EconomyItem';
import { Auction, type IAuction } from '../../models/Auction';
import { randomUUID } from 'crypto';

export class EconomyService {
  /**
   * Get or create user economy data
   */
  static async getUser(userId: string, username: string): Promise<IUser> {
    let user = await User.findOne({ userId });
    
    if (!user) {
      user = new User({
        userId,
        username,
        discriminator: '0',
        economy: {
          wallet: 1000,
          bank: 0,
          bankLimit: 10000,
          dailyStreak: 0,
          lastDaily: null,
          lastWork: null,
          level: 1,
          experience: 0,
          inventory: [],
          transactions: [],
          settings: {
            dmsOnAuction: true,
            autoDeposit: false,
            publicProfile: true
          }
        },
        joinedServers: [],
        lastSeen: new Date()
      });
      
      await user.save();
    }
    
    return user;
  }

  /**
   * Add money to user's wallet or bank
   */
  static async addMoney(userId: string, amount: number, location: 'wallet' | 'bank' = 'wallet', reason: string = 'Unknown'): Promise<boolean> {
    try {
      const user = await User.findOne({ userId });
      if (!user) return false;

      if (location === 'wallet') {
        user.economy.wallet += amount;
      } else {
        const availableSpace = user.economy.bankLimit - user.economy.bank;
        const amountToAdd = Math.min(amount, availableSpace);
        user.economy.bank += amountToAdd;
        
        if (amountToAdd < amount) {
          user.economy.wallet += (amount - amountToAdd);
        }
      }

      // Add transaction
      user.economy.transactions.push({
        type: 'earn',
        amount,
        description: reason,
        timestamp: new Date(),
        metadata: { location }
      });

      // Keep only last 100 transactions
      if (user.economy.transactions.length > 100) {
        user.economy.transactions = user.economy.transactions.slice(-100);
      }

      await user.save();
      return true;
    } catch (error) {
      console.error('Error adding money:', error);
      return false;
    }
  }

  /**
   * Remove money from user's wallet or bank
   */
  static async removeMoney(userId: string, amount: number, location: 'wallet' | 'bank' = 'wallet', reason: string = 'Unknown': Promise<boolean> {
    try {
      const user = await User.findOne({ userId });
      if (!user) return false;

      if (location === 'wallet') {
        if (user.economy.wallet < amount) return false;
        user.economy.wallet -= amount;
      } else {
        if (user.economy.bank < amount) return false;
        user.economy.bank -= amount;
      }

      // Add transaction
      user.economy.transactions.push({
        type: 'spend',
        amount: -amount,
        description: reason,
        timestamp: new Date(),
        metadata: { location }
      });

      // Keep only last 100 transactions
      if (user.economy.transactions.length > 100) {
        user.economy.transactions = user.economy.transactions.slice(-100);
      }

      await user.save();
      return true;
    } catch (error) {
      console.error('Error removing money:', error);
      return false;
    }
  }

  /**
   * Transfer money between wallet and bank
   */
  static async transferMoney(userId: string, amount: number, from: 'wallet' | 'bank', to: 'wallet' | 'bank'): Promise<boolean> {
    try {
      const user = await User.findOne({ userId });
      if (!user) return false;

      if (from === 'wallet') {
        if (user.economy.wallet < amount) return false;
        user.economy.wallet -= amount;
      } else {
        if (user.economy.bank < amount) return false;
        user.economy.bank -= amount;
      }

      if (to === 'wallet') {
        user.economy.wallet += amount;
      } else {
        const availableSpace = user.economy.bankLimit - user.economy.bank;
        const amountToAdd = Math.min(amount, availableSpace);
        user.economy.bank += amountToAdd;
        
        if (amountToAdd < amount) {
          user.economy.wallet += (amount - amountToAdd);
        }
      }

      await user.save();
      return true;
    } catch (error) {
      console.error('Error transferring money:', error);
      return false;
    }
  }

  /**
   * Get user's inventory
   */
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
      console.error('Error getting inventory:', error);
      return [];
    }
  }

  /**
   * Get user's inventory with updated sell prices
   */
  static async getUserInventory(userId: string, category?: string): Promise<{ success: boolean; inventory?: (EconomyItem & { sellPrice: number })[]; message?: string }> {
    try {
      const user = await User.findOne({ userId });
      if (!user) return { success: true, inventory: [] };

      let inventory = user.economy.inventory;
      
      if (category && category !== 'all') {
        inventory = inventory.filter(item => item.category === category);
      }

      // Calculate current sell prices for all items
      const inventoryWithPrices = await Promise.all(
        inventory.map(async (item) => {
          const currentSellPrice = await this.getItemPrice(item.itemId, 'sell');
          return {
            ...item,
            sellPrice: currentSellPrice
          };
        })
      );

      return { success: true, inventory: inventoryWithPrices };
    } catch (error) {
      console.error('Error getting user inventory:', error);
      return { success: false, message: 'Failed to retrieve inventory' };
    }
  }

  /**
   * Add item to user's inventory with sell price
   */
  static async addItem(userId: string, itemId: string, quantity: number = 1, purchasePrice: number = 0): Promise<boolean> {
    try {
      const user = await User.findOne({ userId });
      const item = await EconomyItemModel.findOne({ itemId });
      
      if (!user || !item) return false;

      // Calculate sell price
      const sellPrice = await this.getItemPrice(itemId, 'sell');

      // Check if user already has this item
      const existingItem = user.economy.inventory.find(inv => inv.itemId === itemId);
      
      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.sellPrice = sellPrice;
      } else {
        user.economy.inventory.push({
          itemId: item.itemId,
          name: item.name,
          description: item.description,
          category: item.category,
          quantity,
          purchasePrice,
          purchaseDate: new Date(),
          rarity: item.rarity,
          tradeable: item.tradeable,
          sellable: item.sellable,
          sellPrice
        });
      }

      await user.save();
      return true;
    } catch (error) {
      console.error('Error adding item:', error);
      return false;
    }
  }

  /**
   * Remove item from user's inventory
   */
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
      console.error('Error removing item:', error);
      return false;
    }
  }

  /**
   * Calculate item price with market fluctuations
   */
  static async getItemPrice(itemId: string, type: 'buy' | 'sell' = 'buy'): Promise<number> {
    try {
      const item = await EconomyItemModel.findOne({ itemId });
      if (!item) return 0;

      let price = item.basePrice;
      
      // Apply rarity multiplier
      const rarityMultipliers: Record<string, number> = {
        common: 1,
        uncommon: 1.5,
        rare: 2.5,
        epic: 4,
        legendary: 7,
        mythical: 12
      };
      
      price *= rarityMultipliers[item.rarity] || 1;
      
      // Apply market fluctuation (±20% for buying, -30% for selling)
      if (type === 'buy') {
        const fluctuation = (Math.random() - 0.5) * 0.4; // ±20%
        price *= (1 + fluctuation);
      } else {
        price *= 0.7; // Sell for 70% of buy price
      }
      
      return Math.floor(price);
    } catch (error) {
      console.error('Error calculating item price:', error);
      return 0;
    }
  }

  /**
   * Purchase item from shop
   */
  static async purchaseItem(userId: string, itemId: string, quantity: number = 1): Promise<{ success: boolean; message: string; cost?: number }> {
    try {
      const user = await User.findOne({ userId });
      const item = await EconomyItemModel.findOne({ itemId });
      
      if (!user) return { success: false, message: 'User not found' };
      if (!item) return { success: false, message: 'Item not found' };
      if (!item.shop.available) return { success: false, message: 'Item not available in shop' };
      
      // Check stock
      if (item.shop.stock !== -1 && item.shop.stock < quantity) {
        return { success: false, message: 'Insufficient stock' };
      }

      const unitPrice = await this.getItemPrice(itemId, 'buy');
      const totalCost = unitPrice * quantity;

      // Check if user has enough money
      if (user.economy.wallet < totalCost) {
        return { success: false, message: 'Insufficient funds', cost: totalCost };
      }

      // Remove money and add item
      const moneyRemoved = await this.removeMoney(userId, totalCost, 'wallet', `Purchased ${quantity}x ${item.name}`);
      if (!moneyRemoved) return { success: false, message: 'Failed to process payment' };

      const itemAdded = await this.addItem(userId, itemId, quantity, unitPrice);
      if (!itemAdded) {
        // Refund if item couldn't be added
        await this.addMoney(userId, totalCost, 'wallet', 'Refund for failed purchase');
        return { success: false, message: 'Failed to add item to inventory' };
      }

      // Update shop stock
      if (item.shop.stock !== -1) {
        item.shop.stock -= quantity;
        await item.save();
      }

      return { success: true, message: `Successfully purchased ${quantity}x ${item.name}`, cost: totalCost };
    } catch (error) {
      console.error('Error purchasing item:', error);
      return { success: false, message: 'An error occurred during purchase' };
    }
  }

  /**
   * Sell item from inventory
   */
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

      // Find item by name in user's inventory
      const userItem = user.economy.inventory.find(inv => 
        inv.name.toLowerCase().includes(itemName.toLowerCase())
      );

      if (!userItem) return { success: false, message: 'You don\'t have this item' };
      if (userItem.quantity < quantity) return { success: false, message: 'Insufficient quantity' };
      if (!userItem.sellable) return { success: false, message: 'This item cannot be sold' };

      const unitPrice = await this.getItemPrice(userItem.itemId, 'sell');
      const totalEarned = unitPrice * quantity;

      // Remove item and add money
      const itemRemoved = await this.removeItem(userId, userItem.itemId, quantity);
      if (!itemRemoved) return { success: false, message: 'Failed to remove item' };

      await this.addMoney(userId, totalEarned, 'wallet', `Sold ${quantity}x ${userItem.name}`);

      // Get updated user data
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
      console.error('Error selling item:', error);
      return { success: false, message: 'An error occurred during sale' };
    }
  }

  /**
   * Create auction
   */
  static async createAuction(
    sellerId: string,
    sellerUsername: string,
    guildId: string,
    itemId: string,
    quantity: number,
    startingPrice: number,
    duration: number, // in hours
    buyoutPrice?: number
  ): Promise<{ success: boolean; message: string; auctionId?: string }> {
    try {
      const user = await User.findOne({ userId: sellerId });
      const item = await EconomyItemModel.findOne({ itemId });
      
      if (!user) return { success: false, message: 'User not found' };
      if (!item) return { success: false, message: 'Item not found' };
      if (!item.tradeable) return { success: false, message: 'Item cannot be traded' };

      const userItem = user.economy.inventory.find(inv => inv.itemId === itemId);
      if (!userItem) return { success: false, message: 'You don\'t have this item' };
      if (userItem.quantity < quantity) return { success: false, message: 'Insufficient quantity' };

      // Remove item from inventory temporarily
      const itemRemoved = await this.removeItem(sellerId, itemId, quantity);
      if (!itemRemoved) return { success: false, message: 'Failed to remove item from inventory' };

      const auctionId = randomUUID();
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + duration);

      const auction = new Auction({
        auctionId,
        sellerId,
        sellerUsername,
        guildId,
        itemId,
        itemName: item.name,
        quantity,
        startingPrice,
        currentBid: startingPrice,
        buyoutPrice,
        bidHistory: [],
        endTime,
        status: 'active'
      });

      await auction.save();
      return { success: true, message: 'Auction created successfully', auctionId };
    } catch (error) {
      console.error('Error creating auction:', error);
      return { success: false, message: 'Failed to create auction' };
    }
  }

  /**
   * Place bid on auction
   */
  static async placeBid(
    auctionId: string,
    bidderId: string,
    bidderUsername: string,
    amount: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const auction = await Auction.findOne({ auctionId, status: 'active' });
      const user = await User.findOne({ userId: bidderId });
      
      if (!auction) return { success: false, message: 'Auction not found or inactive' };
      if (!user) return { success: false, message: 'User not found' };
      if (auction.sellerId === bidderId) return { success: false, message: 'Cannot bid on your own auction' };
      if (new Date() > auction.endTime) return { success: false, message: 'Auction has ended' };
      if (amount <= auction.currentBid) return { success: false, message: 'Bid must be higher than current bid' };
      if (user.economy.wallet < amount) return { success: false, message: 'Insufficient funds' };

      // Refund previous highest bidder
      if (auction.highestBidderId && auction.highestBidderId !== bidderId) {
        await this.addMoney(auction.highestBidderId, auction.currentBid, 'wallet', 'Auction bid refund');
      }

      // Hold new bid amount
      const moneyRemoved = await this.removeMoney(bidderId, amount, 'wallet', `Bid on auction ${auctionId}`);
      if (!moneyRemoved) return { success: false, message: 'Failed to process bid' };

      // Update auction
      auction.currentBid = amount;
      auction.highestBidderId = bidderId;
      auction.highestBidderUsername = bidderUsername;
      auction.bidHistory.push({
        bidderId,
        bidderUsername,
        amount,
        timestamp: new Date()
      });

      await auction.save();
      return { success: true, message: 'Bid placed successfully' };
    } catch (error) {
      console.error('Error placing bid:', error);
      return { success: false, message: 'Failed to place bid' };
    }
  }

  /**
   * Get leaderboard
   */
  static async getLeaderboard(type: 'wallet' | 'bank' | 'total' | 'level', limit: number = 10): Promise<any[]> {
    try {
      let sortField: any;
      let pipeline: any[] = [];

      if (type === 'total') {
        pipeline = [
          {
            $addFields: {
              totalMoney: { $add: ['$economy.wallet', '$economy.bank'] }
            }
          },
          { $sort: { totalMoney: -1 } }
        ];
      } else if (type === 'wallet') {
        sortField = { 'economy.wallet': -1 };
      } else if (type === 'bank') {
        sortField = { 'economy.bank': -1 };
      } else if (type === 'level') {
        sortField = { 'economy.level': -1, 'economy.experience': -1 };
      }

      if (sortField) {
        pipeline = [{ $sort: sortField }];
      }

      pipeline.push({ $limit: limit });

      const users = await User.aggregate(pipeline);
      return users;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  /**
   * Add diamonds to user's inventory
   */
  static async addDiamonds(userId: string, amount: number, reason: string = 'Unknown'): Promise<boolean> {
    try {
      // Check if diamond item exists, if not create it
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

      return await this.addItem(userId, 'diamond', amount, 0);
    } catch (error) {
      console.error('Error adding diamonds:', error);
      return false;
    }
  }

  /**
   * Get user's diamond count
   */
  static async getDiamonds(userId: string): Promise<number> {
    try {
      const user = await User.findOne({ userId });
      if (!user) return 0;

      const diamondItem = user.economy.inventory.find(item => 
        item.itemId === 'diamond' || item.name.toLowerCase().includes('diamond')
      );
      
      return diamondItem ? diamondItem.quantity : 0;
    } catch (error) {
      console.error('Error getting diamonds:', error);
      return 0;
    }
  }
}
