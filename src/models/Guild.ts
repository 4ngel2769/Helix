import { Schema, model, Document } from 'mongoose';

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
}

const guildSchema = new Schema<IGuild>({
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
  verificationRoleId: { type: String, default: null }
});

export const Guild = model<IGuild>('Guild', guildSchema);
