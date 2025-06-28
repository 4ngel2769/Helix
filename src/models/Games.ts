import { Schema, model, Document } from 'mongoose';

interface GameStats {
    userId: string;
    wins: number;
    losses: number;
    gamesPlayed: number;
}

interface IGame extends Document {
    gameName: string;
    stats: GameStats[];
}

const gameSchema = new Schema<IGame>({
    gameName: { type: String, required: true },
    stats: [
        {
            userId: { type: String, required: true },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            gamesPlayed: { type: Number, default: 0 }
        }
    ]
});

export const Games = model<IGame>('Games', gameSchema);