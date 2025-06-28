import mongoose, { Schema, model, models, Document, Model } from 'mongoose';

interface TicTacToeStats {
    wins: number;
    losses: number;
    draws: number;
    gamesPlayed: number;
}

interface GameStats {
    multiplayer: {
        tictactoe: TicTacToeStats;
    };
    singleplayer: {
        tictactoe: TicTacToeStats;
    };
}

interface IGameStats extends Document {
    userId: string;
    gameStats: GameStats;
}

// Function to dynamically create a model for a specific game
export const getGameStatsModel = (gameName: string): Model<IGameStats> => {
    const modelName = `${gameName}_stats`;

    if (models[modelName]) {
        return models[modelName];
    }

    const schema = new Schema<IGameStats>({
        userId: { type: String, required: true },
        gameStats: {
            multiplayer: {
                tictactoe: {
                    wins: { type: Number, default: 0 },
                    losses: { type: Number, default: 0 },
                    draws: { type: Number, default: 0 },
                    gamesPlayed: { type: Number, default: 0 }
                }
            },
            singleplayer: {
                tictactoe: {
                    wins: { type: Number, default: 0 },
                    losses: { type: Number, default: 0 },
                    draws: { type: Number, default: 0 },
                    gamesPlayed: { type: Number, default: 0 }
                }
            }
        }
    });

    return model<IGameStats>(modelName, schema);
};