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
          jobId: null,
          jobGrade: 0,
          jobXp: 0,
          jobSince: null,
          lastShiftAt: null,
          jobStreak: 0,
          jobStrikes: 0,
          firedAt: null,
          jobsWorked: 0,
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
    } else {
      // Backfill job fields for users created before the job market existed.
      const jobDefaults: Record<keyof Pick<typeof user.economy, 'jobId' | 'jobGrade' | 'jobXp' | 'jobSince' | 'lastShiftAt' | 'jobStreak' | 'jobStrikes' | 'firedAt' | 'jobsWorked'>, unknown> = {
        jobId: null,
        jobGrade: 0,
        jobXp: 0,
        jobSince: null,
        lastShiftAt: null,
        jobStreak: 0,
        jobStrikes: 0,
        firedAt: null,
        jobsWorked: 0
      };
      let touched = false;
      for (const [key, value] of Object.entries(jobDefaults)) {
        if ((user.economy as unknown as Record<string, unknown>)[key] === undefined) {
          (user.economy as unknown as Record<string, unknown>)[key] = value;
          touched = true;
        }
      }
      if (touched) await user.save();
    }

    return user;
  }
}
