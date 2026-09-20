/**
 * Job market business logic â€” applications, shifts, strikes, promotions.
 */
import { MoneyService } from './MoneyService';
import { UserService } from './UserService';
import type { IUser } from '../../../models/User';
import {
	JOB_REAPPLY_COOLDOWN_HOURS,
	JOB_STREAK_GRACE_HOURS,
	JOB_STRIKES_TO_DEMOTE,
	JOB_STRIKES_TO_FIRE,
	JOBS,
	acceptChanceFor,
	findJob,
	rollApplication,
	rollShiftPay,
	tierForXp,
	type JobDefinition,
	PROMOTION_TIERS
} from '../../../lib/economy/jobs';

export interface ApplicationResult {
	accepted: boolean;
	job: JobDefinition;
	chance: number;
	message: string;
}

export interface ShiftResult {
	pay: number;
	jobXp: number;
	streak: number;
	strikes: number;
	promotedTo: string | null;
	demotedTo: string | null;
	fired: boolean;
	message: string;
}

const HOURS = 3_600_000;

export class JobService {
	static async apply(userId: string, username: string, jobInput: string): Promise<ApplicationResult> {
		const job = findJob(jobInput);
		if (!job) {
			const list = JOBS.map((entry) => `\`${entry.id}\``).join(', ');
			throw new Error(`Unknown job \`${jobInput}\`. Available jobs: ${list}.`);
		}

		const user = await UserService.getUser(userId, username);
		const now = Date.now();

		if (user.economy.firedAt && now - new Date(user.economy.firedAt).getTime() < JOB_REAPPLY_COOLDOWN_HOURS * HOURS) {
			const remaining = Math.ceil((JOB_REAPPLY_COOLDOWN_HOURS * HOURS - (now - new Date(user.economy.firedAt).getTime())) / HOURS);
			throw new Error(`You were fired recently â€” wait ~${remaining}h before applying again.`);
		}
		if (user.economy.jobId === job.id) throw new Error(`You already work as a ${job.title}. Use \`/work\` to do a shift.`);
		if (user.economy.level < job.requiredLevel) {
			throw new Error(
				`\`${job.title}\` needs economy level ${job.requiredLevel} (you are level ${user.economy.level}). Earn XP with \`/daily\` and \`/work\`, then re-apply.`
			);
		}

		const chance = acceptChanceFor(job, user.economy.level);
		if (!rollApplication(job, user.economy.level)) {
			return {
				accepted: false,
				job,
				chance,
				message: `âŒ **${job.title} â€” application rejected.** They only hire ~${Math.round(chance * 100)}% of level ${user.economy.level} applicants like you. Try again soon!`
			};
		}

		user.economy.jobId = job.id;
		user.economy.jobGrade = 0;
		user.economy.jobXp = 0;
		user.economy.jobSince = new Date();
		user.economy.lastShiftAt = null;
		user.economy.jobStreak = 0;
		user.economy.jobStrikes = 0;
		await user.save();

		return {
			accepted: true,
			job,
			chance,
			message: `✅ **You're hired as a ${job.title}!** ${job.emoji}\nYour first shift is ready — run \`/work\` to earn your first paycheck. Work every day to climb from Intern to Director!`
		};
	}

	static async resign(userId: string, username: string): Promise<string> {
		const user = await UserService.getUser(userId, username);
		if (!user.economy.jobId) return 'You are currently unemployed. Apply with `/jobs`.';
		const job = this.currentJob(user);
		const title = job ? job.title : (user.economy.jobId ?? 'unknown');
		user.economy.jobId = null;
		user.economy.jobGrade = 0;
		user.economy.jobXp = 0;
		user.economy.jobSince = null;
		user.economy.jobStreak = 0;
		user.economy.jobStrikes = 0;
		await user.save();
		return `You resigned from **${title}**. The job board (\`/jobs\`) is always open if you change your mind.`;
	}

	static currentJob(user: IUser): JobDefinition | null {
		return user.economy.jobId ? (findJob(user.economy.jobId) ?? null) : null;
	}



	static async shift(userId: string, username: string): Promise<ShiftResult> {
		const user = await UserService.getUser(userId, username);
		const job = this.currentJob(user);
		if (!job) throw new Error('You are unemployed — apply with `/jobs` first.');

		const now = Date.now();
		const lastShift = user.economy.lastShiftAt ? new Date(user.economy.lastShiftAt).getTime() : null;
		const shiftMs = job.shiftHours * HOURS;

		if (lastShift !== null && now - lastShift < shiftMs) {
			const remaining = Math.ceil((shiftMs - (now - lastShift)) / HOURS);
			throw new Error(`You're still resting. Next shift at **${job.title}** unlocks in ~${remaining}h.`);
		}

		// Absences past the grace window add a strike; the checks below demote, then fire.
		const gap = lastShift === null ? 0 : now - lastShift;
		let strikes = user.economy.jobStrikes ?? 0;
		const strikesAdded = lastShift !== null && gap > shiftMs + JOB_STREAK_GRACE_HOURS * HOURS;
		if (strikesAdded) strikes += 1;

		if (strikes >= JOB_STRIKES_TO_FIRE) {
			user.economy.jobId = null;
			user.economy.jobGrade = 0;
			user.economy.jobXp = 0;
			user.economy.jobSince = null;
			user.economy.jobStreak = 0;
			user.economy.jobStrikes = 0;
			user.economy.firedAt = new Date();
			user.economy.lastWork = new Date();
			await user.save();
			return {
				pay: 0,
				jobXp: 0,
				streak: 0,
				strikes: 0,
				promotedTo: null,
				demotedTo: null,
				fired: true,
				message:
					`🚫 **You're FIRED from ${job.title}.** ${JOB_STRIKES_TO_FIRE} missed-shift strikes in a row.\n` +
					`You can re-apply anywhere in ${JOB_REAPPLY_COOLDOWN_HOURS}h. Show up every day next time!`
			};
		}

		let grade = user.economy.jobGrade ?? 0;
		let demotedTo: string | null = null;
		if (grade > 0 && strikes >= JOB_STRIKES_TO_DEMOTE) {
			grade -= 1;
			demotedTo = `${(PROMOTION_TIERS[grade] ?? PROMOTION_TIERS[0]).title} ${job.title}`;
		}

		const streak = lastShift === null || gap > JOB_STREAK_GRACE_HOURS * HOURS * 2 ? 1 : (user.economy.jobStreak ?? 0) + 1;
		const pay = rollShiftPay(job, grade, user.economy.level);
		await MoneyService.addMoney(userId, pay, 'wallet', `Work shift as ${job.title}`);

		const jobXp = (user.economy.jobXp ?? 0) + job.xpPerShift;
		const tier = tierForXp(jobXp);
		const promotedTo = tier.grade > grade ? `${tier.title} ${job.title}` : null;
		if (tier.grade > grade) grade = tier.grade;

		const xpGain = job.xpPerShift * 10;
		user.economy.experience += xpGain;
		user.economy.jobXp = jobXp;
		user.economy.jobGrade = grade;
		user.economy.jobStreak = streak;
		user.economy.jobStrikes = demotedTo ? 0 : strikes;
		user.economy.lastShiftAt = new Date();
		user.economy.lastWork = new Date();
		user.economy.jobsWorked = (user.economy.jobsWorked ?? 0) + 1;
		await user.save();

		const streakEmoji = streak >= 7 ? '🔥' : '💪';
		let message =
			`${job.emoji} **Shift complete as ${demotedTo ?? promotedTo ?? `${tier.title} ${job.title}`}!**\n` +
			`💸 Earned **${pay.toLocaleString()}** coins (+${xpGain} XP).\n` +
			`${streakEmoji} Work streak: **${streak}** shift${streak === 1 ? '' : 's'}.`;
		if (strikesAdded) message += `\n⚠️ You skipped shifts before this one — strike ${demotedTo ? 0 : strikes} (demote at ${JOB_STRIKES_TO_DEMOTE}, fired at ${JOB_STRIKES_TO_FIRE}).`;
		if (promotedTo) message += `\n🎉 **PROMOTED to ${promotedTo}!** Your pay band just went up.`;
		if (demotedTo) message += `\n📉 Missed shifts cost you a grade — you're back to ${demotedTo}. Show up daily to climb again!`;

		return { pay, jobXp, streak, strikes: demotedTo ? 0 : strikes, promotedTo, demotedTo, fired: false, message };
	}
}
