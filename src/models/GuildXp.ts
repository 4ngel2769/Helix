import { Schema, model, Document } from 'mongoose';

export interface IGuildXp extends Document {
	guildId: string;
	userId: string;
	xp: number;
	lastAwardAt: Date | null;
}

const guildXpSchema = new Schema<IGuildXp>({
	guildId: { type: String, required: true },
	userId: { type: String, required: true },
	xp: { type: Number, default: 0 },
	lastAwardAt: { type: Date, default: null }
});

guildXpSchema.index({ guildId: 1, userId: 1 }, { unique: true });
guildXpSchema.index({ guildId: 1, xp: -1 });

export const GuildXp = model<IGuildXp>('GuildXp', guildXpSchema);
