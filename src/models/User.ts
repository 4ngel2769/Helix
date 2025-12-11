import { Schema, model, Document } from 'mongoose';

// Interface for economy items in user inventory
export interface EconomyItem {
  itemId: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: Date;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical' | 'divine' | 'cursed';
  tradeable: boolean;
  sellable: boolean;
  sellPrice?: number;
  equipped?: boolean;
  equipSlot?: string;
  durability?: number;
  customData?: Record<string, any>;
}

// Interface for active effects on user
export interface ActiveEffect {
  type: string;
  value: number;
  duration: number; // remaining time in seconds
  stackCount: number;
  source: string; // item name or source
  appliedAt: Date;
  expiresAt: Date;
}

// Interface for player stats
export interface PlayerStats {
  health: number;
  maxHealth: number;
  sanity: number;
  maxSanity: number;
  energy: number;
  maxEnergy: number;
  hunger: number;
  maxHunger: number;
  thirst: number;
  maxThirst: number;
  
  // Combat stats
  attack: number;
  defense: number;
  speed: number;
  accuracy: number;
  
  // Skill stats
  strength: number;
  intelligence: number;
  charisma: number;
  stealth: number;
  luck: number;
  
  // Special stats
  corruption: number;
  karma: number;
  reputation: number;
}

// Interface for user equipment
export interface Equipment {
  head?: string; // itemId
  chest?: string;
  legs?: string;
  feet?: string;
  hands?: string;
  weapon?: string;
  shield?: string;
  accessory?: string;
  ring?: string;
  necklace?: string;
}

// Interface for transaction history
export interface Transaction {
  type: 'earn' | 'spend' | 'transfer' | 'auction_win' | 'auction_sell' | 'daily' | 'work' | 'gamble' | 'craft' | 'quest' | 'effect' | 'trade';
  amount: number;
  description: string;
  timestamp: Date;
  relatedUserId?: string;
  relatedItemId?: string;
  metadata?: Record<string, any>;
}

// Interface for user economy data
export interface UserEconomyData {
  wallet: number;
  bank: number;
  bankLimit: number;
  dailyStreak: number;
  lastDaily: Date | null;
  lastWork: Date | null;
  level: number;
  experience: number;
  inventory: EconomyItem[];
  equipment: Equipment;
  stats: PlayerStats;
  activeEffects: ActiveEffect[];
  transactions: Transaction[];
  achievements: string[];
  settings: {
    dmsOnAuction: boolean;
    autoDeposit: boolean;
    publicProfile: boolean;
    autoEquipBetter: boolean;
    showEffectNotifications: boolean;
  };
}

export interface IUser extends Document {
  userId: string;
  username: string;
  discriminator: string;
  displayName?: string;
  pronouns?: string;
  bio?: string;
  economy: UserEconomyData;
  joinedServers: string[];
  lastSeen: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  discriminator: { type: String, default: '0' },
  displayName: { type: String, default: null },
  pronouns: { type: String, default: null },
  bio: { type: String, default: '' },
  
  economy: {
    wallet: { type: Number, default: 1000 },
    bank: { type: Number, default: 0 },
    bankLimit: { type: Number, default: 10000 },
    dailyStreak: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null },
    lastWork: { type: Date, default: null },
    level: { type: Number, default: 1 },
    experience: { type: Number, default: 0 },
    
    inventory: [{
      itemId: { type: String, required: true },
      name: { type: String, required: true },
      description: { type: String, default: '' },
      category: { type: String, default: 'misc' },
      quantity: { type: Number, default: 1 },
      purchasePrice: { type: Number, default: 0 },
      purchaseDate: { type: Date, default: Date.now },
      rarity: { 
        type: String, 
        enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical', 'divine', 'cursed'],
        default: 'common'
      },
      tradeable: { type: Boolean, default: true },
      sellable: { type: Boolean, default: true },
      sellPrice: { type: Number, required: false },
      equipped: { type: Boolean, default: false },
      equipSlot: { type: String, required: false },
      durability: { type: Number, required: false },
      customData: { type: Schema.Types.Mixed, default: {} }
    }],
    
    equipment: {
      head: { type: String, default: null },
      chest: { type: String, default: null },
      legs: { type: String, default: null },
      feet: { type: String, default: null },
      hands: { type: String, default: null },
      weapon: { type: String, default: null },
      shield: { type: String, default: null },
      accessory: { type: String, default: null },
      ring: { type: String, default: null },
      necklace: { type: String, default: null }
    },
    
    stats: {
      // Basic stats
      health: { type: Number, default: 100 },
      maxHealth: { type: Number, default: 100 },
      sanity: { type: Number, default: 100 },
      maxSanity: { type: Number, default: 100 },
      energy: { type: Number, default: 100 },
      maxEnergy: { type: Number, default: 100 },
      hunger: { type: Number, default: 100 },
      maxHunger: { type: Number, default: 100 },
      thirst: { type: Number, default: 100 },
      maxThirst: { type: Number, default: 100 },
      
      // Combat stats
      attack: { type: Number, default: 10 },
      defense: { type: Number, default: 10 },
      speed: { type: Number, default: 10 },
      accuracy: { type: Number, default: 10 },
      
      // Skill stats
      strength: { type: Number, default: 10 },
      intelligence: { type: Number, default: 10 },
      charisma: { type: Number, default: 10 },
      stealth: { type: Number, default: 10 },
      luck: { type: Number, default: 10 },
      
      // Special stats
      corruption: { type: Number, default: 0 },
      karma: { type: Number, default: 0 },
      reputation: { type: Number, default: 0 }
    },
    
    activeEffects: [{
      type: { type: String, required: true },
      value: { type: Number, required: true },
      duration: { type: Number, required: true },
      stackCount: { type: Number, default: 1 },
      source: { type: String, required: true },
      appliedAt: { type: Date, default: Date.now },
      expiresAt: { type: Date, required: true }
    }],
    
    transactions: [{
      type: { 
        type: String, 
        enum: ['earn', 'spend', 'transfer', 'auction_win', 'auction_sell', 'daily', 'work', 'gamble', 'craft', 'quest', 'effect', 'trade'],
        required: true 
      },
      amount: { type: Number, required: true },
      description: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      relatedUserId: { type: String, default: null },
      relatedItemId: { type: String, default: null },
      metadata: { type: Schema.Types.Mixed, default: {} }
    }],
    
    achievements: [{ type: String }],
    
    settings: {
      dmsOnAuction: { type: Boolean, default: true },
      autoDeposit: { type: Boolean, default: false },
      publicProfile: { type: Boolean, default: true },
      autoEquipBetter: { type: Boolean, default: false },
      showEffectNotifications: { type: Boolean, default: true }
    }
  },
  
  joinedServers: [{ type: String }],
  lastSeen: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Create indexes for better performance
userSchema.index({ userId: 1 });
userSchema.index({ 'economy.wallet': -1 });
userSchema.index({ 'economy.bank': -1 });
userSchema.index({ 'economy.level': -1 });
userSchema.index({ 'economy.activeEffects.expiresAt': 1 });

export const User = model<IUser>('User', userSchema);
