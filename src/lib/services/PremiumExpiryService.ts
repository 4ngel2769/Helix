import { container } from '@sapphire/framework';
import { Guild } from '../../models/Guild';
import { User } from '../../models/User';
import { notifyGuildPremiumEnding, notifyUserPremiumEnding } from '../utils/ownerNotify';

const REMIND_WITHIN_MS = 24 * 60 * 60 * 1000;

function sameExpiry(a: unknown, b: unknown): boolean {
	const ta = a ? new Date(a as string | Date).getTime() : 0;
	const tb = b ? new Date(b as string | Date).getTime() : 0;
	return ta !== 0 && ta === tb;
}

export class PremiumExpiryService {
	/**
	 * DM users + guild owners whose timed premium ends within ~24h.
	 * Runs hourly from the background job. One reminder per grant:
	 * premiumReminderSentAt records which expiry was already announced
	 * (a fresh grant clears it, so re-grants remind again).
	 */
	public static async processExpiringPremium(): Promise<void> {
		const now = new Date();
		const horizon = new Date(Date.now() + REMIND_WITHIN_MS);

		let users;
		try {
			users = await User.find(
				{ isPremium: true, premiumExpiresAt: { $gt: now, $lte: horizon } },
				{ userId: 1, premiumExpiresAt: 1, premiumReminderSentAt: 1 }
			).lean();
		} catch (error) {
			container.logger.warn('[premium-expiry] user lookup failed:', error);
			return;
		}
		for (const u of users) {
			if (sameExpiry(u.premiumReminderSentAt, u.premiumExpiresAt)) continue;
			try {
				const sent = await notifyUserPremiumEnding(u.userId, u.premiumExpiresAt as Date);
				if (!sent) container.logger.warn(`[premium-expiry] could not DM user ${u.userId} (DMs closed?)`);
				await User.updateOne({ userId: u.userId }, { $set: { premiumReminderSentAt: u.premiumExpiresAt } });
			} catch (error) {
				container.logger.warn(`[premium-expiry] user ${u.userId} skipped:`, error);
			}
		}

		let guilds;
		try {
			guilds = await Guild.find(
				{ isPremium: true, premiumExpiresAt: { $gt: now, $lte: horizon } },
				{ guildId: 1, premiumExpiresAt: 1, premiumReminderSentAt: 1 }
			).lean();
		} catch (error) {
			container.logger.warn('[premium-expiry] guild lookup failed:', error);
			return;
		}
		for (const g of guilds) {
			if (sameExpiry(g.premiumReminderSentAt, g.premiumExpiresAt)) continue;
			try {
				const sent = await notifyGuildPremiumEnding(g.guildId, g.premiumExpiresAt as Date);
				if (!sent) container.logger.warn(`[premium-expiry] could not DM owner of guild ${g.guildId}`);
				await Guild.updateOne({ guildId: g.guildId }, { $set: { premiumReminderSentAt: g.premiumExpiresAt } });
			} catch (error) {
				container.logger.warn(`[premium-expiry] guild ${g.guildId} skipped:`, error);
			}
		}
	}
}
