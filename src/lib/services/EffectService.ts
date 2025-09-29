import { User, type ActiveEffect, type IUser } from '../../models/User';
import { EconomyItem, type ItemEffect } from '../../models/EconomyItem';

export interface EffectResult {
  success: boolean;
  message: string;
  appliedEffects?: string[];
  statChanges?: Record<string, number>;
  duration?: number;
}

export class EffectService {
  /**
   * Apply effects from an item to a user
   */
  static async applyItemEffects(
    userId: string, 
    itemId: string, 
    trigger: 'use' | 'equip' | 'consume' | 'attack' | 'defend' | 'idle' | 'death' | 'level_up' = 'use'
  ): Promise<EffectResult> {
    try {
      const user = await User.findOne({ userId });
      const item = await EconomyItem.findOne({ itemId });

      if (!user || !item) {
        return { success: false, message: 'User or item not found' };
      }

      if (!item.effects || item.effects.length === 0) {
        return { success: false, message: 'Item has no effects' };
      }

      const appliedEffects: string[] = [];
      const statChanges: Record<string, number> = {};

      for (const effect of item.effects) {
        // Check if effect triggers on this action
        if (effect.triggers && !effect.triggers.includes(trigger)) {
          continue;
        }

        // Check chance
        if (effect.chance && Math.random() * 100 > effect.chance) {
          continue;
        }

        const result = await this.applyEffect(user, effect, item.name);
        if (result.success) {
          appliedEffects.push(result.message);
          if (result.statChanges) {
            Object.assign(statChanges, result.statChanges);
          }
        }
      }

      await user.save();

      return {
        success: appliedEffects.length > 0,
        message: appliedEffects.join(', '),
        appliedEffects,
        statChanges
      };

    } catch (error) {
      console.error('Error applying item effects:', error);
      return { success: false, message: 'Failed to apply effects' };
    }
  }

  /**
   * Apply a single effect to a user
   */
  private static async applyEffect(user: IUser, effect: ItemEffect, source: string): Promise<EffectResult> {
    const now = new Date();
    const statChanges: Record<string, number> = {};

    switch (effect.type) {
      case 'heal':
        const healAmount = Math.min(effect.value, user.economy.stats.maxHealth - user.economy.stats.health);
        user.economy.stats.health += healAmount;
        statChanges.health = healAmount;
        return { 
          success: true, 
          message: `Healed ${healAmount} HP`, 
          statChanges 
        };

      case 'harm':
        const harmAmount = Math.min(effect.value, user.economy.stats.health);
        user.economy.stats.health -= harmAmount;
        statChanges.health = -harmAmount;
        return { 
          success: true, 
          message: `Lost ${harmAmount} HP`, 
          statChanges 
        };

      case 'sanity':
        const sanityChange = effect.value;
        const newSanity = Math.max(0, Math.min(user.economy.stats.maxSanity, user.economy.stats.sanity + sanityChange));
        const actualSanityChange = newSanity - user.economy.stats.sanity;
        user.economy.stats.sanity = newSanity;
        statChanges.sanity = actualSanityChange;
        return { 
          success: true, 
          message: actualSanityChange >= 0 ? `Gained ${actualSanityChange} sanity` : `Lost ${Math.abs(actualSanityChange)} sanity`, 
          statChanges 
        };

      case 'energy':
        const energyChange = effect.value;
        const newEnergy = Math.max(0, Math.min(user.economy.stats.maxEnergy, user.economy.stats.energy + energyChange));
        const actualEnergyChange = newEnergy - user.economy.stats.energy;
        user.economy.stats.energy = newEnergy;
        statChanges.energy = actualEnergyChange;
        return { 
          success: true, 
          message: actualEnergyChange >= 0 ? `Gained ${actualEnergyChange} energy` : `Lost ${Math.abs(actualEnergyChange)} energy`, 
          statChanges 
        };

      case 'experience':
        const expGain = effect.value;
        user.economy.experience += expGain;
        statChanges.experience = expGain;
        
        // Check for level up
        const newLevel = Math.floor(Math.sqrt(user.economy.experience / 100)) + 1;
        if (newLevel > user.economy.level) {
          user.economy.level = newLevel;
          statChanges.level = newLevel - user.economy.level;
        }
        
        return { 
          success: true, 
          message: `Gained ${expGain} experience`, 
          statChanges 
        };

      case 'money':
        const moneyGain = effect.value;
        user.economy.wallet += moneyGain;
        statChanges.money = moneyGain;
        return { 
          success: true, 
          message: moneyGain >= 0 ? `Gained ${moneyGain} coins` : `Lost ${Math.abs(moneyGain)} coins`, 
          statChanges 
        };

      // All stat effects (including attack, defense, accuracy)
      case 'luck':
      case 'strength':
      case 'intelligence':
      case 'charisma':
      case 'speed':
      case 'stealth':
      case 'attack':
      case 'defense':
      case 'accuracy':
      case 'protection':
        return this.applyTemporaryStatEffect(user, effect, source);

      // DOT and status effects
      case 'poison':
      case 'burn':
      case 'freeze':
      case 'shock':
      case 'regeneration':
        return this.applyDotEffect(user, effect, source);

      case 'confusion':
      case 'fear':
      case 'rage':
      case 'calm':
      case 'focus':
      case 'blind':
      case 'deaf':
      case 'mute':
      case 'paralysis':
      case 'sleep':
      case 'charm':
        return this.applyStatusEffect(user, effect, source);

      // Special effects
      case 'shield':
      case 'reflect':
      case 'absorb':
        return this.applyDefensiveEffect(user, effect, source);

      case 'teleport':
        return this.applyTeleportEffect(user, effect, source);

      case 'multiply':
      case 'divide':
        return this.applyMathEffect(user, effect, source);

      case 'transform':
        return this.applyTransformEffect(user, effect, source);

      default:
        return { success: false, message: `Unknown effect type: ${effect.type}` };
    }
  }

  /**
   * Apply temporary stat effects
   */
  private static applyTemporaryStatEffect(user: IUser, effect: ItemEffect, source: string): EffectResult {
    if (!effect.duration) {
      // Permanent stat change - only for base stats, not combat stats
      const allowedPermanentStats = ['strength', 'intelligence', 'charisma', 'speed', 'stealth', 'luck'];
      
      if (allowedPermanentStats.includes(effect.type)) {
        const statKey = effect.type as keyof typeof user.economy.stats;
        (user.economy.stats as any)[statKey] += effect.value;
        return { 
          success: true, 
          message: `Permanently ${effect.value >= 0 ? 'increased' : 'decreased'} ${effect.type} by ${Math.abs(effect.value)}`,
          statChanges: { [effect.type]: effect.value }
        };
      } else {
        // Combat stats should be temporary
        effect.duration = 300; // Default 5 minutes for combat stats
      }
    }

    // Temporary effect
    const expiresAt = new Date(Date.now() + (effect.duration || 300) * 1000);
    
    // Check if effect already exists and is stackable
    const existingEffect = user.economy.activeEffects.find(
      e => e.type === effect.type && e.source === source
    );

    if (existingEffect && effect.stackable) {
      existingEffect.stackCount += 1;
      existingEffect.value += effect.value;
      existingEffect.expiresAt = expiresAt;
    } else if (existingEffect && !effect.stackable) {
      // Refresh existing effect
      existingEffect.expiresAt = expiresAt;
      existingEffect.value = effect.value;
    } else {
      // Add new effect
      user.economy.activeEffects.push({
        type: effect.type,
        value: effect.value,
        duration: effect.duration || 300,
        stackCount: 1,
        source,
        appliedAt: new Date(),
        expiresAt
      });
    }

    return { 
      success: true, 
      message: `Applied ${effect.type} effect (+${effect.value}) for ${effect.duration || 300}s`,
      duration: effect.duration || 300
    };
  }

  /**
   * Apply damage/healing over time effects
   */
  private static applyDotEffect(user: IUser, effect: ItemEffect, source: string): EffectResult {
    const expiresAt = new Date(Date.now() + (effect.duration || 30) * 1000);
    
    user.economy.activeEffects.push({
      type: effect.type,
      value: effect.value,
      duration: effect.duration || 30,
      stackCount: 1,
      source,
      appliedAt: new Date(),
      expiresAt
    });

    const effectNames = {
      poison: 'Poisoned',
      burn: 'Burning',
      freeze: 'Frozen',
      shock: 'Shocked',
      regeneration: 'Regenerating'
    };

    return { 
      success: true, 
      message: `Applied ${effectNames[effect.type as keyof typeof effectNames]} effect`,
      duration: effect.duration || 30
    };
  }

  /**
   * Apply status effects
   */
  private static applyStatusEffect(user: IUser, effect: ItemEffect, source: string): EffectResult {
    const expiresAt = new Date(Date.now() + (effect.duration || 60) * 1000);
    
    user.economy.activeEffects.push({
      type: effect.type,
      value: effect.value,
      duration: effect.duration || 60,
      stackCount: 1,
      source,
      appliedAt: new Date(),
      expiresAt
    });

    return { 
      success: true, 
      message: `Applied ${effect.type} status effect`,
      duration: effect.duration || 60
    };
  }

  /**
   * Apply defensive effects
   */
  private static applyDefensiveEffect(user: IUser, effect: ItemEffect, source: string): EffectResult {
    const expiresAt = new Date(Date.now() + (effect.duration || 120) * 1000);
    
    user.economy.activeEffects.push({
      type: effect.type,
      value: effect.value,
      duration: effect.duration || 120,
      stackCount: 1,
      source,
      appliedAt: new Date(),
      expiresAt
    });

    const effectNames = {
      shield: 'Shield',
      reflect: 'Damage Reflection',
      absorb: 'Damage Absorption'
    };

    return { 
      success: true, 
      message: `Applied ${effectNames[effect.type as keyof typeof effectNames]} (${effect.value} points)`,
      duration: effect.duration || 120
    };
  }

  /**
   * Apply teleport effect
   */
  private static applyTeleportEffect(user: IUser, effect: ItemEffect, source: string): EffectResult {
    // Teleport is instant effect
    return { 
      success: true, 
      message: `Teleported to a random location!`,
      statChanges: { teleport: 1 }
    };
  }

  /**
   * Apply mathematical effects
   */
  private static applyMathEffect(user: IUser, effect: ItemEffect, source: string): EffectResult {
    if (effect.type === 'multiply') {
      user.economy.wallet = Math.floor(user.economy.wallet * effect.value);
      return { 
        success: true, 
        message: `Multiplied your coins by ${effect.value}!`,
        statChanges: { money: user.economy.wallet }
      };
    } else if (effect.type === 'divide') {
      user.economy.wallet = Math.floor(user.economy.wallet / effect.value);
      return { 
        success: true, 
        message: `Divided your coins by ${effect.value}`,
        statChanges: { money: -user.economy.wallet }
      };
    }

    return { success: false, message: 'Unknown math effect' };
  }

  /**
   * Apply transformation effects
   */
  private static applyTransformEffect(user: IUser, effect: ItemEffect, source: string): EffectResult {
    const expiresAt = new Date(Date.now() + (effect.duration || 600) * 1000);
    
    user.economy.activeEffects.push({
      type: effect.type,
      value: effect.value,
      duration: effect.duration || 600,
      stackCount: 1,
      source,
      appliedAt: new Date(),
      expiresAt
    });

    return { 
      success: true, 
      message: `Transformed! Effect will last ${(effect.duration || 600) / 60} minutes`,
      duration: effect.duration || 600
    };
  }

  /**
   * Process expired effects and apply DOT effects
   */
  static async processActiveEffects(userId: string): Promise<void> {
    try {
      const user = await User.findOne({ userId });
      if (!user) return;

      const now = new Date();
      const toRemove: number[] = [];

      for (let i = 0; i < user.economy.activeEffects.length; i++) {
        const effect = user.economy.activeEffects[i];

        // Check if effect expired
        if (effect.expiresAt <= now) {
          toRemove.push(i);
          continue;
        }

        // Apply DOT effects
        if (['poison', 'burn', 'regeneration'].includes(effect.type)) {
          const secondsSinceApplied = Math.floor((now.getTime() - effect.appliedAt.getTime()) / 1000);
          const tickInterval = 5; // Apply every 5 seconds
          
          if (secondsSinceApplied % tickInterval === 0) {
            switch (effect.type) {
              case 'poison':
              case 'burn':
                user.economy.stats.health = Math.max(0, user.economy.stats.health - effect.value);
                break;
              case 'regeneration':
                user.economy.stats.health = Math.min(user.economy.stats.maxHealth, user.economy.stats.health + effect.value);
                break;
            }
          }
        }
      }

      // Remove expired effects (in reverse order to maintain indices)
      for (let i = toRemove.length - 1; i >= 0; i--) {
        user.economy.activeEffects.splice(toRemove[i], 1);
      }

      await user.save();

    } catch (error) {
      console.error('Error processing active effects:', error);
    }
  }

  /**
   * Get all active effects for a user
   */
  static async getActiveEffects(userId: string): Promise<ActiveEffect[]> {
    try {
      const user = await User.findOne({ userId });
      if (!user) return [];

      // Clean up expired effects first
      await this.processActiveEffects(userId);

      return user.economy.activeEffects;

    } catch (error) {
      console.error('Error getting active effects:', error);
      return [];
    }
  }

  /**
   * Calculate total stat modifiers from active effects
   */
  static calculateStatModifiers(effects: ActiveEffect[]): Record<string, number> {
    const modifiers: Record<string, number> = {};

    for (const effect of effects) {
      if (['strength', 'intelligence', 'charisma', 'speed', 'stealth', 'attack', 'defense', 'accuracy', 'luck', 'protection'].includes(effect.type)) {
        modifiers[effect.type] = (modifiers[effect.type] || 0) + (effect.value * effect.stackCount);
      }
    }

    return modifiers;
  }

  /**
   * Remove specific effect
   */
  static async removeEffect(userId: string, effectType: string, source?: string): Promise<boolean> {
    try {
      const user = await User.findOne({ userId });
      if (!user) return false;

      const effectIndex = user.economy.activeEffects.findIndex(
        e => e.type === effectType && (!source || e.source === source)
      );

      if (effectIndex !== -1) {
        user.economy.activeEffects.splice(effectIndex, 1);
        await user.save();
        return true;
      }

      return false;

    } catch (error) {
      console.error('Error removing effect:', error);
      return false;
    }
  }
}
