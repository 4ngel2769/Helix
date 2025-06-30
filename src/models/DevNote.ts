import mongoose, { Schema, model, models, Document, Model } from 'mongoose';

export interface IDevNote extends Document {
    _id: mongoose.Types.ObjectId;
    content: string;
    suggestedBy?: string; // User ID
    createdAt: Date;
    updatedAt: Date;
}

const DevNoteSchema = new Schema<IDevNote>({
    content: { 
        type: String, 
        required: true,
        maxlength: 2000 // Discord embed field limit
    },
    suggestedBy: { 
        type: String, 
        required: false 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Update the updatedAt field before saving
DevNoteSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Make sure we export the typed model
export const DevNote: Model<IDevNote> = models.DevNote || model<IDevNote>('DevNote', DevNoteSchema);