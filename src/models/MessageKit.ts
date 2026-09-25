import { randomUUID } from 'node:crypto';
import { model, Schema, type Document, type Types } from 'mongoose';

/**
 * A message kit: a named, shareable bundle of message overrides for one locale.
 *
 * A guild has at most one ACTIVE kit (`Guild.activeKitId`). Importing someone
 * else's kit does not reference it — it copies the messages into a new document
 * owned by the importing guild (`sourceKitId` records provenance) so the author
 * editing their kit later cannot silently rewrite your server.
 */
export interface IMessageKit extends Document<Types.ObjectId> {
	kitId: string;
	name: string;
	description: string;
	locale: string;
	authorId: string;
	authorName: string;
	/** Guild the kit was authored in; null for a kit authored outside any guild. */
	ownerGuildId: string | null;
	/** Set when this kit is a local copy of a shared kit. */
	sourceKitId: string | null;
	messages: Map<string, string>;
	imports: number;
	createdAt: Date;
	updatedAt: Date;
}

const messageKitSchema = new Schema<IMessageKit>({
	kitId: { type: String, required: true, unique: true, index: true },
	name: { type: String, required: true, maxlength: 48 },
	description: { type: String, default: '', maxlength: 200 },
	locale: { type: String, default: 'en', maxlength: 8 },
	authorId: { type: String, required: true },
	authorName: { type: String, default: '', maxlength: 64 },
	ownerGuildId: { type: String, default: null },
	sourceKitId: { type: String, default: null },
	messages: { type: Map, of: String, default: {} },
	imports: { type: Number, default: 0 }
});

messageKitSchema.index({ updatedAt: -1 });

/** Short, URL-safe, and long enough that guessing a kit id is pointless. */
export function newKitId(): string {
	return randomUUID().replaceAll('-', '').slice(0, 16);
}

export const MessageKit = model<IMessageKit>('MessageKit', messageKitSchema);
