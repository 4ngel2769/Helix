import { User, type IUser } from '../../../models/User';
import type { PipelineStage } from 'mongoose';
import { container } from '@sapphire/framework';

export class LeaderboardService {
  static async getLeaderboard(type: 'wallet' | 'bank' | 'total' | 'level', limit: number = 10): Promise<IUser[]> {
    try {
      let sortField: Record<string, 1 | -1> | undefined;
      let pipeline: PipelineStage[] = [];

      if (type === 'total') {
        pipeline = [
          {
            $addFields: {
              totalMoney: { $add: ['$economy.wallet', '$economy.bank'] }
            }
          },
          { $sort: { totalMoney: -1 } }
        ];
      } else if (type === 'wallet') {
        sortField = { 'economy.wallet': -1 };
      } else if (type === 'bank') {
        sortField = { 'economy.bank': -1 };
      } else if (type === 'level') {
        sortField = { 'economy.level': -1, 'economy.experience': -1 };
      }

      if (sortField) {
        pipeline = [{ $sort: sortField }];
      }

      pipeline.push({ $limit: limit });

      const users = await User.aggregate(pipeline);
      return users;
    } catch (error) {
      container.logger.error('Error getting leaderboard:', error);
      return [];
    }
  }
}
