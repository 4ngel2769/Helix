import { Schema, model, Document } from 'mongoose';
import { getAllModuleKeys, getModuleConfig } from '../config/modules';

// Interface for verification settings
interface VerificationSettings {
  verificationChannelId?: string;
  verificationRoleId?: string;
  verificationMessageId?: string;
  verificationMessage?: string;
  verificationDisabledMessage?: string;
  verificationTitle?: string;
  verificationFooter?: string;
  verificationThumb?: string;
  verificationLastModifiedBy?: {
    username: string;
    id: string;
    timestamp: Date;
  };
}

// Update the LockedChannel interface
interface LockedChannel {
  channelId: string;
  originalPermissions: Array<{
    id: string;
    allow: string;
    deny: string;
    type: number;
  }>;
  lockedBy: string;
  lockedAt: Date;
  reason?: string;
  // Add these additional properties
  lockTimestamp?: number;
  duration?: number;
  unlockTimestamp?: number;
  moderator?: {
    id: string;
    tag: string;
  };
}

// AutoMod keywords interface
interface AutoModKeywords {
  profanity: string[];
  scams: string[];
  phishing: string[];
  custom: string[];
}

// Module settings interface
interface ModuleSettings {
  [key: string]: boolean;
}

// Legacy module flags for backward compatibility
interface LegacyModuleFlags {
  isAdministration?: boolean;
  isModeration?: boolean;
  isFunModule?: boolean;
  isVerificationModule?: boolean;
  isWelcomingModule?: boolean;
  isEconomyModule?: boolean;}

// Interface for reaction roles
interface ReactionRole {
  roleId: string;
  label: string;
  description?: string;
  emoji?: string;
}

interface ReactionRolesMenu {
  messageId: string;
  channelId: string;
  title: string;
  description: string;
  roles: ReactionRole[];
  maxSelections: number; // 0 for unlimited
  active: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface IGuild extends Document, LegacyModuleFlags, VerificationSettings {
  guildId: string;
  prefix?: string;
  adminRoleId?: string;
  modRoleId?: string;
  muteRoleId?: string;
  disabledCommands?: string[];
  modLogChannelId?: string;
  memberLogChannelId?: string;
  messageEditLogChannelId?: string;
  messageDeleteLogChannelId?: string;
  lockedChannels?: LockedChannel[];
  modules: ModuleSettings;
  automodKeywords?: AutoModKeywords;
  reactionRolesMenus?: ReactionRolesMenu[];
}

const guildSchema = new Schema<IGuild>({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: null },
  adminRoleId: { type: String, default: null },
  modRoleId: { type: String, default: null },
  muteRoleId: { type: String, default: null },
  disabledCommands: { type: [String], default: [] },
  
  // Logging channels
  modLogChannelId: { type: String, default: null },
  memberLogChannelId: { type: String, default: null },
  messageEditLogChannelId: { type: String, default: null },
  messageDeleteLogChannelId: { type: String, default: null },
  
  // Legacy module flags (for backward compatibility)
  isAdministration: { type: Boolean, default: true },
  isModeration: { type: Boolean, default: true },
  isFunModule: { type: Boolean, default: true },
  isVerificationModule: { type: Boolean, default: false },
  isWelcomingModule: { type: Boolean, default: false },
  isEconomyModule: { type: Boolean, default: true },// Verification settings
  verificationChannelId: { type: String, default: null },
  verificationRoleId: { type: String, default: null },
  verificationMessageId: { type: String, default: null },
  verificationMessage: { type: String, default: 'Click the button below to verify yourself and gain access to the server!' },
  verificationDisabledMessage: { type: String, default: 'Verification is currently disabled.' },
  verificationTitle: { type: String, default: 'Server Verification' },
  verificationFooter: { type: String, default: null },
  verificationThumb: { type: String, default: null },
  verificationLastModifiedBy: {
    username: { type: String, default: null },
    id: { type: String, default: null },
    timestamp: { type: Date, default: Date.now }
  },
  
  // Locked channels
  lockedChannels: [{
    channelId: { type: String, required: true },
    originalPermissions: [{
      id: { type: String, required: true },
      allow: { type: String, default: '0' },
      deny: { type: String, default: '0' },
      type: { type: Number, default: 0 }
    }],
    lockedBy: { type: String, default: null },
    lockedAt: { type: Date, default: Date.now },
    reason: { type: String, default: null },
    // Additional properties
    lockTimestamp: { type: Number, default: null },
    duration: { type: Number, default: null },
    unlockTimestamp: { type: Number, default: null },
    moderator: {
      id: { type: String, default: null },
      tag: { type: String, default: null }
    }
  }],
  
  // New module configuration system
  modules: { 
    type: Schema.Types.Mixed, 
    default: () => {
      const defaults: ModuleSettings = {};
      getAllModuleKeys().forEach(moduleKey => {
        const config = getModuleConfig(moduleKey);
        if (config) {
          defaults[moduleKey] = config.defaultEnabled;
        }
      });
      return defaults;
    }
  },
  
  // AutoMod keywords
  automodKeywords: {
    profanity: { type: [String], default: [] },
    scams: { type: [String], default: [] },
    phishing: { type: [String], default: [] },
    custom: { type: [String], default: [] }
  },
  
  // Reaction roles menus
  reactionRolesMenus: [{
    messageId: { type: String, required: true },
    channelId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    roles: [{
      roleId: { type: String, required: true },
      label: { type: String, required: true },
      description: { type: String, default: null },
      emoji: { type: String, default: null }
    }],
    maxSelections: { type: Number, default: 0 }, // 0 for unlimited
    active: { type: Boolean, default: true },
    createdBy: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
  }]
});

// Add a pre-save middleware to sync legacy module flags with new module system
guildSchema.pre('save', function(next) {
  // Sync from legacy to new system
  if (this.isModified('isAdministration')) {
    this.modules.administration = this.isAdministration ?? true;
  }
  if (this.isModified('isModeration')) {
    this.modules.moderation = this.isModeration ?? true;
  }
  if (this.isModified('isFunModule')) {
    this.modules.fun = this.isFunModule ?? true;
  }
  if (this.isModified('isVerificationModule')) {
    this.modules.verification = this.isVerificationModule ?? false;
  }
  if (this.isModified('isWelcomingModule')) {
    this.modules.welcoming = this.isWelcomingModule ?? false;
  }
  if (this.isModified('isEconomyModule')) {
    this.modules.economy = this.isEconomyModule ?? true;
  }// Sync from new system to legacy
  if (this.isModified('modules.administration')) {
    this.isAdministration = this.modules.administration;
  }
  if (this.isModified('modules.moderation')) {
    this.isModeration = this.modules.moderation;
  }
  if (this.isModified('modules.fun')) {
    this.isFunModule = this.modules.fun;
  }
  if (this.isModified('modules.verification')) {
    this.isVerificationModule = this.modules.verification;
  }
  if (this.isModified('modules.welcoming')) {
    this.isWelcomingModule = this.modules.welcoming;
  }
  if (this.isModified('modules.economy')) {
    this.isEconomyModule = this.modules.economy;
  }
});

export const Guild = model<IGuild>('Guild', guildSchema);
