import { container } from '@sapphire/framework';
import { User, type UserWarning } from '../../models/User';
import { Guild, type IGuild } from '../../models/Guild';
import { sendLog } from '../logging/logService';

export type WarningSource = 'manual' | 'automod' | 'api' | 'system';
export type WarningAction = 'timeout' | 'kick' | 'ban';

export interface CreateWarningOptions {
	guildId: string;
	userId: string;
	reason: string;
	moderatorId: string;
	moderatorTag: string;
	source?: WarningSource;
	rule?: string;
	channelId?: string;
	message?: string;
	dm?: boolean;
}

export interface WarningEscalation {
	action: WarningAction;
	duration?: number;
}

export interface WarningRecord extends UserWarning {
	_id?: string;
}

export class ModerationService {
	public static async createWarning(options: CreateWarningOptions): Promise<{ warning: WarningRecord; activeCount: number; escalation?: WarningEscalation }> {
		const settings = await Guild.findOne({ guildId: options.guildId }, { warnSettings: 1 }).lean() as Pick<IGuild, 'warnSettings'> | null;
		const reason = this.resolveReason(options.reason, settings?.warnSettings?.reasonAliases);
		const warning: UserWarning = {
			guildId: options.guildId,
			reason: reason.slice(0, 1000),
			moderatorId: options.moderatorId,
			moderatorTag: options.moderatorTag,
			timestamp: new Date(),
			active: true,
			source: options.source ?? 'manual',
			rule: options.rule,
			channelId: options.channelId,
			message: options.message?.slice(0, 2000)
		};
		const user = await User.findOne({ userId: options.userId });
		if (!user) {
			await User.create({ userId: options.userId, username: options.userId, discriminator: '0', warnings: [warning] });
		} else {
			user.warnings = user.warnings.filter((entry) => entry.guildId !== options.guildId).slice(-99);
			user.warnings.push(warning);
			await user.save();
		}
		const created = ((user ?? (await User.findOne({ userId: options.userId }, { warnings: 1 })))?.warnings?.at(-1) ?? warning) as WarningRecord;
		const activeCount = await this.getActiveWarningCount(options.guildId, options.userId);
		const escalation = await this.applyThreshold(options.guildId, options.userId, activeCount, reason);
		if (options.dm ?? settings?.warnSettings?.dmEnabled ?? false) {
			await this.sendWarningDm(options.userId, options.guildId, reason, created, settings?.warnSettings?.dmTemplate);
		}
		const guild = container.client.guilds.cache.get(options.guildId);
		if (guild) {
			await sendLog(guild, 'mod.warn', {
				description: `<@${options.userId}> received a warning from **${options.moderatorTag}** (<@${options.moderatorId}>).`,
				fields: [
					{ name: 'Reason', value: created.reason },
					{ name: 'Active warnings', value: String(activeCount) }
				],
				actorId: options.moderatorId,
				targetId: options.userId,
				contextChannelId: options.channelId,
				isBot: false
			}).catch(() => false);
		}
		return { warning: created, activeCount, escalation };
	}

	public static async getActiveWarningCount(guildId: string, userId: string): Promise<number> {
		const user = await User.findOne({ userId, 'warnings.guildId': guildId, 'warnings.active': true }, { 'warnings.guildId': 1, 'warnings.active': 1 }).lean();
		return (user?.warnings ?? []).filter((warning) => warning.guildId === guildId && warning.active).length;
	}

	public static async listWarnings(guildId: string, userId: string, activeOnly = true): Promise<WarningRecord[]> {
		const user = await User.findOne({ userId }, { warnings: 1 }).lean();
		return (user?.warnings ?? [])
			.filter((warning) => warning.guildId === guildId && (!activeOnly || warning.active))
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) as WarningRecord[];
	}

	public static async clearWarning(guildId: string, userId: string, warningId: string, clearedBy?: string): Promise<boolean> {
		const result = await User.updateOne(
			{ userId, warnings: { $elemMatch: { _id: warningId, guildId, active: true } } },
			{ $set: { 'warnings.$.active': false, 'warnings.$.clearedAt': new Date(), 'warnings.$.clearedBy': clearedBy } }
		);
		return result.modifiedCount > 0;
	}

	public static async applyAction(guildId: string, userId: string, action: WarningAction, reason: string, durationSeconds = 600): Promise<boolean> {
		const guild = container.client.guilds.cache.get(guildId);
		if (!guild) return false;
		try {
			if (action === 'timeout') {
				const member = await guild.members.fetch(userId);
				await member.timeout(durationSeconds * 1000, `Warning action: ${reason}`);
			} else if (action === 'kick') {
				const member = await guild.members.fetch(userId);
				await member.kick(`Warning action: ${reason}`);
			} else {
				await guild.members.ban(userId, { reason: `Warning action: ${reason}` });
			}
			return true;
		} catch {
			return false;
		}
	}

	private static resolveReason(reason: string, aliases?: Record<string, string>): string {
		const key = reason.trim().replace(/\s+/g, ' ').toLowerCase();
		const alias = Object.entries(aliases ?? {}).find(([name]) => name.trim().replace(/\s+/g, ' ').toLowerCase() === key);
		return (alias?.[1] ?? reason).trim().slice(0, 1000);
	}

	private static async sendWarningDm(userId: string, guildId: string, reason: string, warning: WarningRecord, template?: string | null): Promise<void> {
		const user = await container.client.users.fetch(userId).catch(() => null);
		if (!user) return;
		const guild = container.client.guilds.cache.get(guildId);
		const content = (template ?? 'You have received a warning in **{guild}**.\nReason: {reason}\nCase: {case}')
			.replaceAll('{user}', `<@${userId}>`)
			.replaceAll('{guild}', guild?.name ?? 'this server')
			.replaceAll('{reason}', reason)
			.replaceAll('{case}', warning._id ?? 'saved')
			.replaceAll('@everyone', '@ everyone')
			.replaceAll('@here', '@ here')
			.slice(0, 2000);
		await user.send(content).catch(() => null);
	}

	private static async applyThreshold(guildId: string, userId: string, activeCount: number, reason: string): Promise<WarningEscalation | undefined> {
		const guildData = await Guild.findOne({ guildId }, { warnSettings: 1 }).lean() as Pick<IGuild, 'warnSettings'> | null;
		const threshold = (guildData?.warnSettings?.thresholds ?? []).find((entry) => entry.count === activeCount);
		if (!threshold) return undefined;
		const applied = await this.applyAction(guildId, userId, threshold.action, `Warning threshold: ${reason}`, (threshold.duration ?? 10) * 60);
		return applied ? { action: threshold.action, duration: threshold.duration } : undefined;
	}
}
