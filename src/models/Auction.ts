import { Schema, model, Document } from 'mongoose';

export interface IAuction extends Document {
  auctionId: string;
  sellerId: string;
  sellerUsername: string;
  guildId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  startingPrice: number;
  currentBid: number;
  buyoutPrice?: number;
  highestBidderId?: string;
  highestBidderUsername?: string;
  bidHistory: {
    bidderId: string;
    bidderUsername: string;
    amount: number;
    timestamp: Date;
  }[];
  startTime: Date;
  endTime: Date;
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  winnerNotified: boolean;
  sellerNotified: boolean;
  metadata: Record<string, any>;
}

const auctionSchema = new Schema<IAuction>({
  auctionId: { type: String, required: true, unique: true },
  sellerId: { type: String, required: true },
  sellerUsername: { type: String, required: true },
  guildId: { type: String, required: true },
  itemId: { type: String, required: true },
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true },
  startingPrice: { type: Number, required: true },
  currentBid: { type: Number, required: true },
  buyoutPrice: { type: Number, default: null },
  highestBidderId: { type: String, default: null },
  highestBidderUsername: { type: String, default: null },
  
  bidHistory: [{
    bidderId: { type: String, required: true },
    bidderUsername: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['active', 'completed', 'cancelled', 'expired'],
    default: 'active'
  },
  winnerNotified: { type: Boolean, default: false },
  sellerNotified: { type: Boolean, default: false },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

auctionSchema.index({ auctionId: 1 });
auctionSchema.index({ sellerId: 1 });
auctionSchema.index({ guildId: 1 });
auctionSchema.index({ status: 1 });
auctionSchema.index({ endTime: 1 });

export const Auction = model<IAuction>('Auction', auctionSchema);
