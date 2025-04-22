import mongoose, { Document } from 'mongoose';

interface IGuild extends Document {
  guildId: string;
  isModeration: boolean;
  isAdministration: boolean;
  isFunModule: boolean;
  isWelcomingModule: boolean;
  isVerificationModule: boolean;
  isModule: boolean;
  // Verification settings
  verificationChannelId: string | null;
  verificationMessageId: string | null;
  verificationMessage: string | null;
  verificationRoleId: string | null;
  verificationLastModifiedBy: {
    userId: string;
    username: string;
    timestamp: Date;
  } | null;
  verificationDisabledMessage: string | null;
  verificationTitle: string | null;
  verificationFooter: string | null;
  verificationThumb: string | null;
  adminRoleId: string | null;
  modRoleId: string | null;
  welcomeChannel?: string;
  welcomeMessage?: string;
  lockedChannels?: Array<{
    channelId: string;
    lockTimestamp: number;
    duration: number;
    unlockTimestamp: number;
    moderator: {
      id: string;
      tag: string;
    };
  }>;
}

const guildSchema = new mongoose.Schema<IGuild>({
  guildId: { type: String, required: true, unique: true },
  isModeration: { type: Boolean, default: false },
  isAdministration: { type: Boolean, default: false },
  isFunModule: { type: Boolean, default: false },
  isWelcomingModule: { type: Boolean, default: false },
  isVerificationModule: { type: Boolean, default: false },
  isModule: { type: Boolean, default: false },
  // Verification settings
  verificationChannelId: { type: String, default: null },
  verificationMessageId: { type: String, default: null },
  verificationMessage: { type: String, default: "Click the button below to verify yourself and gain access to the server!" },
  verificationRoleId: { type: String, default: null },
  verificationLastModifiedBy: {
    userId: { type: String, default: null },
    username: { type: String, default: null },
    timestamp: { type: Date, default: null }
  },
  verificationDisabledMessage: { type: String, default: "⚠️ Verification is currently disabled. Please try again later." },
  verificationTitle: { type: String, default: "Server Verification" },
  verificationFooter: { type: String, default: null },
  verificationThumb: { type: String, default: null },
  adminRoleId: { type: String, default: null },
  modRoleId: { type: String, default: null },
  welcomeChannel: String,
  welcomeMessage: String,
  lockedChannels: [{
    channelId: String,
    lockTimestamp: Number,
    duration: Number,
    unlockTimestamp: Number,
    moderator: {
      id: String,
      tag: String
    }
  }]
});

export const Guild = mongoose.model<IGuild>('Guild', guildSchema);
