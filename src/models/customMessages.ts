import { Schema, model, Document } from 'mongoose';

interface ICustomMessage extends Document {
  guildId: string;
  messages: Record<string, string>;
}

const customMessageSchema = new Schema<ICustomMessage>({
  guildId: { type: String, required: true, unique: true },
  messages: { type: Map, of: String, default: {} },
});

export const CustomMessage = model<ICustomMessage>('CustomMessage', customMessageSchema);
