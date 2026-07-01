import { User, type IUser } from '../../../models/User';

export class UserService {
  static async getUser(userId: string, username: string): Promise<IUser> {
    let user = await User.findOne({ userId });

    if (!user) {
      user = new User({
        userId,
        username,
        discriminator: '0',
        economy: {
          wallet: 1000,
          bank: 0,
          bankLimit: 10000,
          dailyStreak: 0,
          lastDaily: null,
          lastWork: null,
          level: 1,
          experience: 0,
          inventory: [],
          transactions: [],
          settings: {
            dmsOnAuction: true,
            autoDeposit: false,
            publicProfile: true
          }
        },
        joinedServers: [],
        lastSeen: new Date()
      });

      await user.save();
    }

    return user;
  }
}
