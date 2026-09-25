import { Events, Listener } from '@sapphire/framework';
import type { Client, VoiceState } from 'discord.js';
import { getGuildAutomation } from '../lib/utils/guildAutomationCache';
import { adjustXp, announceLevelUp, syncRoleRewards } from '../lib/utils/leveling';

const MINUTE = 60_000;
const SWEEP_MS = 5 * MINUTE;

/** `guildId:userId` -> timestamp of the last accrual. In-memory: a restart drops
 * un-accrued minutes, which is cheaper than persisting voice sessions. */
const sessions = new Map<string, number>();

/** Awards whole minutes of voice XP. Resets the clock even when the guild has
 * voice XP disabled so toggling the setting on doesn't award a backlog. */
async function accrue(client: Client, guildId: string, userId: string): Promise<void> {
	const key = `${guildId}:${userId}`;
	const now = Date.now();
	const last = sessions.get(key);
	if (last === undefined) {
		sessions.set(key, now);
		return;
	}
	sessions.set(key, now);

	const minutes = Math.floor((now - last) / MINUTE);
	if (minutes < 1) return;

	let auto = null;
	try {
		auto = await getGuildAutomation(guildId);
	} catch {
		return;
	}
	const lv = auto?.leveling;
	const perMinute = auto?.levelingModuleOn ? (lv?.voiceXpPerMinute ?? 0) : 0;
	if (!auto || perMinute <= 0) return;

	const member = client.guilds.cache.get(guildId)?.members.cache.get(userId);
	if (!member || member.user.bot) return;
	if ((lv?.ignoredRoles?.length ?? 0) > 0 && member.roles.cache.some((r) => lv?.ignoredRoles?.includes(r.id))) return;

	try {
		const res = await adjustXp(guildId, userId, minutes * perMinute);
		if (!res?.leveledUp) return;
		const guild = member.guild;
		await syncRoleRewards(member, res.level, lv!);
		await announceLevelUp(guild, member.user, res.level, res.xp, lv!, null);
	} catch {
		// accrual must never break the gateway
	}
}

export class UserEvent extends Listener<typeof Events.VoiceStateUpdate> {
	private static timer: ReturnType<typeof setInterval> | null = null;

	public constructor(context: Listener.Context, options: Listener.Options) {
		super(context, { ...options, event: Events.VoiceStateUpdate });
		if (!UserEvent.timer) UserEvent.timer = setInterval(() => void this.sweep(), SWEEP_MS);
	}

	public override async run(oldState: VoiceState, newState: VoiceState) {
		const guildId = newState.guild?.id ?? oldState.guild?.id;
		if (!guildId) return;
		const key = `${guildId}:${newState.id}`;

		if (!oldState.channelId && newState.channelId) {
			sessions.set(key, Date.now());
			return;
		}
		if (oldState.channelId && !newState.channelId) {
			await accrue(this.container.client, guildId, newState.id);
			sessions.delete(key);
		}
	}

	private async sweep(): Promise<void> {
		await Promise.all([...sessions.keys()].map((key) => {
			const idx = key.indexOf(':');
			return accrue(this.container.client, key.slice(0, idx), key.slice(idx + 1));
		}));
	}
}
