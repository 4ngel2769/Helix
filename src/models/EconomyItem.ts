import { Schema, model, Document } from 'mongoose';

export interface ItemEffect {
  type: 'heal' | 'harm' | 'sanity' | 'energy' | 'luck' | 'experience' | 'money' | 'protection' | 'speed' | 'strength' | 'intelligence' | 'charisma' | 'stealth' | 'regeneration' | 'poison' | 'burn' | 'freeze' | 'shock' | 'confusion' | 'fear' | 'rage' | 'calm' | 'focus' | 'blind' | 'deaf' | 'mute' | 'paralysis' | 'sleep' | 'charm' | 'teleport' | 'shield' | 'reflect' | 'absorb' | 'multiply' | 'divide' | 'transform' | 'attack' | 'defense' | 'accuracy';
  value: number;
  duration?: number; // in seconds, 0 for permanent, undefined for instant
  chance?: number; // percentage chance for effect to trigger (1-100)
  stackable?: boolean; // can multiple instances stack
  description?: string;
  triggers?: ('use' | 'equip' | 'consume' | 'attack' | 'defend' | 'idle' | 'death' | 'level_up')[];
}

export interface ItemRequirement {
  type: 'level' | 'item' | 'money' | 'stat' | 'achievement';
  value: number | string;
  description: string;
}

export interface ItemStats {
  attack?: number;
  defense?: number;
  speed?: number;
  accuracy?: number;
  durability?: number;
  maxDurability?: number;
  weight?: number;
  value?: number;
}

export interface IEconomyItem extends Document {
  itemId: string;
  name: string;
  description: string;
  category: 'weapons' | 'armor' | 'tools' | 'consumables' | 'materials' | 'collectibles' | 'books' | 'scrolls' | 'potions' | 'food' | 'drinks' | 'gems' | 'artifacts' | 'misc' | 'currencies' | 'containers' | 'furniture' | 'vehicles' | 'pets' | 'seeds' | 'crops';
  subcategory?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical' | 'divine' | 'cursed';
  basePrice: number;
  emoji: string;
  image?: string;
  tradeable: boolean;
  sellable: boolean;
  consumable: boolean;
  stackable: boolean;
  maxStack?: number;
  equipable: boolean;
  equipSlot?: 'head' | 'chest' | 'legs' | 'feet' | 'hands' | 'weapon' | 'shield' | 'accessory' | 'ring' | 'necklace';
  effects?: ItemEffect[];
  stats?: ItemStats;
  requirements?: ItemRequirement[];
  craftingRecipe?: {
    materials: { itemId: string; quantity: number }[];
    tools?: string[];
    skill?: string;
    skillLevel?: number;
    time?: number; // crafting time in seconds
  };
  shop: {
    available: boolean;
    stock: number; // -1 for unlimited
    category: string;
    restockTime?: number; // hours until restock
    restockAmount?: number;
  };
  metadata: {
    createdBy?: string;
    createdAt: Date;
    updatedAt?: Date;
    tags?: string[];
    lore?: string;
    discoveredBy?: string[];
    timesUsed?: number;
    popularity?: number;
  };
}

const economyItemSchema = new Schema<IEconomyItem>({
    itemId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
        type: String, 
        required: true, 
        enum: [
            'weapons',
            'armor',
            'tools',
            'consumables',
            'materials',
            'collectibles',
            'books',
            'scrolls',
            'potions',
            'food',
            'drinks',
            'gems',
            'artifacts',
            'misc',
            'currencies',
            'containers',
            'furniture',
            'vehicles',
            'pets',
            'seeds',
            'crops'
        ],
        default: 'misc'
    },
    subcategory: { type: String, required: false },
    rarity: { 
        type: String, 
        required: true, 
        enum: [
            'common',
            'uncommon',
            'rare',
            'epic',
            'legendary',
            'mythical',
            'divine',
            'cursed'
        ],
        default: 'common'
    },
    basePrice: { type: Number, required: true, min: 0 },
    emoji: { type: String, default: '📦' },
    image: { type: String, required: false },
    tradeable: { type: Boolean, default: true },
    sellable: { type: Boolean, default: true },
    consumable: { type: Boolean, default: false },
    stackable: { type: Boolean, default: true },
    maxStack: { type: Number, default: 100 },
    equipable: { type: Boolean, default: false },
    equipSlot: { 
        type: String, 
        enum: [
            'head',
            'chest',
            'legs',
            'feet',
            'hands',
            'weapon',
            'shield',
            'accessory',
            'ring',
            'necklace'
        ],
        required: false 
    },
    
    effects: [{
        type: { 
            type: String, 
            required: true,
            enum: [
                'heal',
                'harm',
                'sanity',
                'energy',
                'luck',
                'experience',
                'money',
                'protection',
                'speed',
                'strength',
                'intelligence',
                'charisma',
                'stealth',
                'regeneration',
                'poison',
                'burn',
                'freeze',
                'shock',
                'confusion',
                'fear',
                'rage',
                'calm',
                'focus',
                'blind',
                'deaf',
                'mute',
                'paralysis',
                'sleep',
                'charm',
                'teleport',
                'shield',
                'reflect',
                'absorb',
                'multiply',
                'divide',
                'transform',
                'attack',
                'defense',
                'accuracy'
            ]
        },
        value: { type: Number, required: true },
        duration: { type: Number, required: false },
        chance: { type: Number, min: 1, max: 100, default: 100 },
        stackable: { type: Boolean, default: false },
        description: { type: String, required: false },
        triggers: [{ 
            type: String, 
            enum: [
                'use',
                'equip',
                'consume',
                'attack',
                'defend',
                'idle',
                'death',
                'level_up'
            ],
            default: ['use']
        }]
    }],
    
    stats: {
        attack: { type: Number, default: 0 },
        defense: { type: Number, default: 0 },
        speed: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },
        durability: { type: Number, required: false },
        maxDurability: { type: Number, required: false },
        weight: { type: Number, default: 1 },
        value: { type: Number, required: false }
    },
    
    requirements: [{
        type: { 
            type: String, 
            required: true,
            enum: [
                'level',
                'item',
                'money',
                'stat',
                'achievement'
            ]
        },
        value: { type: Schema.Types.Mixed, required: true },
        description: { type: String, required: true }
    }],
    
    craftingRecipe: {
        materials: [{
            itemId: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 }
        }],
        tools: [{ type: String }],
        skill: { type: String, required: false },
        skillLevel: { type: Number, min: 1, required: false },
        time: { type: Number, default: 0 }
    },
    
    shop: {
        available: { type: Boolean, default: false },
        stock: { type: Number, default: -1 },
        category: { type: String, required: true },
        restockTime: { type: Number, default: 24 },
        restockAmount: { type: Number, required: false }
    },
    
    metadata: {
        createdBy: { type: String, required: false },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
        tags: [{ type: String }],
        lore: { type: String, required: false },
        discoveredBy: [{ type: String }],
        timesUsed: { type: Number, default: 0 },
        popularity: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Create indexes for better performance
economyItemSchema.index({ itemId: 1 });
economyItemSchema.index({ name: 1 });
economyItemSchema.index({ category: 1 });
economyItemSchema.index({ rarity: 1 });
economyItemSchema.index({ 'shop.available': 1 });
economyItemSchema.index({ 'effects.type': 1 });

export const EconomyItem = model<IEconomyItem>('EconomyItem', economyItemSchema);
