import { Auction, type IAuction } from '../../models/Auction';
import { EconomyService } from './EconomyService';
import { EconomyItem } from '../../models/EconomyItem';
import { randomUUID } from 'crypto';

export interface AuctionResult {
    success: boolean;
    message: string;
    auction?: any;
    auctions?: any[];
    previousBid?: number;
}

export class AuctionService {
    /**
     * Create a new auction
     */
    static async createAuction(
        sellerId: string,
        itemName: string,
        quantity: number,
        startingBid: number,
        duration: number
    ): Promise<AuctionResult> {
        try {
            // Find item by name
            const item = await EconomyItem.findOne({ 
                name: { $regex: itemName, $options: 'i' }
            });

            if (!item) {
                return { success: false, message: 'Item not found' };
            }

            if (!item.tradeable) {
                return { success: false, message: 'This item cannot be traded' };
            }

            // Check if user has the item
            const userInventory = await EconomyService.getInventory(sellerId);
            const userItem = userInventory.find(inv => inv.itemId === item.itemId);

            if (!userItem || userItem.quantity < quantity) {
                return { success: false, message: 'You don\'t have enough of this item' };
            }

            // Remove items from inventory
            const itemRemoved = await EconomyService.removeItem(sellerId, item.itemId, quantity);
            if (!itemRemoved) {
                return { success: false, message: 'Failed to remove items from inventory' };
            }

            const auctionId = randomUUID();
            const endTime = new Date();
            endTime.setHours(endTime.getHours() + duration);

            const auction = new Auction({
                auctionId,
                sellerId,
                sellerUsername: 'User', // You might want to get this from the user
                guildId: 'global', // You might want to pass this in
                itemId: item.itemId,
                itemName: item.name,
                quantity,
                startingPrice: startingBid,
                currentBid: startingBid,
                bidHistory: [],
                endTime,
                status: 'active'
            });

            await auction.save();

            return {
                success: true,
                message: 'Auction created successfully',
                auction: {
                    id: auctionId,
                    item: { name: item.name },
                    endsAt: endTime
                }
            };

        } catch (error) {
            console.error('Error creating auction:', error);
            return { success: false, message: 'Failed to create auction' };
        }
    }

    /**
     * Place a bid on an auction
     */
    static async placeBid(userId: string, auctionId: string, amount: number): Promise<AuctionResult> {
        try {
            const auction = await Auction.findOne({ auctionId, status: 'active' });

            if (!auction) {
                return { success: false, message: 'Auction not found or inactive' };
            }

            if (auction.sellerId === userId) {
                return { success: false, message: 'You cannot bid on your own auction' };
            }

            if (new Date() > auction.endTime) {
                return { success: false, message: 'This auction has ended' };
            }

            if (amount <= auction.currentBid) {
                return { success: false, message: `Bid must be higher than current bid of ${auction.currentBid} coins` };
            }

            const user = await EconomyService.getUser(userId, 'User');
            if (user.economy.wallet < amount) {
                return { success: false, message: 'Insufficient funds' };
            }

            // Refund previous highest bidder
            if (auction.highestBidderId && auction.highestBidderId !== userId) {
                await EconomyService.addMoney(auction.highestBidderId, auction.currentBid, 'wallet', 'Auction bid refund');
            }

            // Remove money from new bidder
            const moneyRemoved = await EconomyService.removeMoney(userId, amount, 'wallet', `Bid on auction ${auctionId}`);
            if (!moneyRemoved) {
                return { success: false, message: 'Failed to process payment' };
            }

            const previousBid = auction.currentBid;

            // Update auction
            auction.currentBid = amount;
            auction.highestBidderId = userId;
            auction.highestBidderUsername = 'User';
            auction.bidHistory.push({
                bidderId: userId,
                bidderUsername: 'User',
                amount,
                timestamp: new Date()
            });

            await auction.save();

            return {
                success: true,
                message: 'Bid placed successfully',
                auction: {
                    quantity: auction.quantity,
                    item: { name: auction.itemName },
                    endsAt: auction.endTime
                },
                previousBid
            };

        } catch (error) {
            console.error('Error placing bid:', error);
            return { success: false, message: 'Failed to place bid' };
        }
    }

    /**
     * Get auctions based on filter
     */
    static async getAuctions(userId: string, filter: string): Promise<AuctionResult> {
        try {
            let query: any = { status: 'active' };

            switch (filter) {
                case 'mine':
                    query.sellerId = userId;
                    break;
                case 'bids':
                    query.highestBidderId = userId;
                    break;
                case 'ending':
                    const oneHourFromNow = new Date();
                    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
                    query.endTime = { $lte: oneHourFromNow };
                    break;
                case 'all':
                default:
                    // No additional filter
                    break;
            }

            const auctions = await Auction.find(query)
                .sort({ endTime: 1 })
                .limit(50);

            const formattedAuctions = auctions.map(auction => ({
                id: auction.auctionId,
                quantity: auction.quantity,
                item: { name: auction.itemName },
                currentBid: auction.currentBid,
                sellerId: auction.sellerId,
                endsAt: auction.endTime
            }));

            return {
                success: true,
                message: 'Auctions retrieved successfully',
                auctions: formattedAuctions
            };

        } catch (error) {
            console.error('Error getting auctions:', error);
            return { success: false, message: 'Failed to retrieve auctions' };
        }
    }

    /**
     * Get a specific auction
     */
    static async getAuction(auctionId: string): Promise<AuctionResult> {
        try {
            const auction = await Auction.findOne({ auctionId });

            if (!auction) {
                return { success: false, message: 'Auction not found' };
            }

            const formattedAuction = {
                id: auction.auctionId,
                quantity: auction.quantity,
                item: { name: auction.itemName },
                currentBid: auction.currentBid,
                startingBid: auction.startingPrice,
                sellerId: auction.sellerId,
                highestBidderId: auction.highestBidderId,
                createdAt: auction.startTime,
                endsAt: auction.endTime,
                bids: auction.bidHistory.map(bid => ({
                    bidderId: bid.bidderId,
                    amount: bid.amount,
                    timestamp: bid.timestamp
                }))
            };

            return {
                success: true,
                message: 'Auction retrieved successfully',
                auction: formattedAuction
            };

        } catch (error) {
            console.error('Error getting auction:', error);
            return { success: false, message: 'Failed to retrieve auction' };
        }
    }
}
