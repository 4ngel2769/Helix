import { Events, Listener } from '@sapphire/framework';
import type { GuildMember, PartialGuildMember } from 'discord.js';
import { sendLog, consumeSuppressed } from '../../lib/logging/logService';

export class GuildMemberUpdateListener extends Listener<typeof Events.GuildMemberUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildMemberUpdate });
	}

	public override async run(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
		const tag = newMember.user.tag;

		// Nickname
		if (oldMember.nickname !== newMember.nickname) {
			await sendLog(newMember.guild, 'member.nickname', {
				description: `**${tag}** (<@${newMember.id}>) nickname changed.`,
				fields: [
					{ name: 'Before', value: oldMember.nickname ?? '*none*', inline: true },
					{ name: 'After', value: newMember.nickname ?? '*none*', inline: true }
				],
				targetId: newMember.id,
				isBot: newMember.user.bot
			});
		}

		// Timeout
		const wasTimedOut = !!oldMember.communicationDisabledUntilTimestamp && oldMember.communicationDisabledUntilTimestamp > Date.now();
		const isTimedOut = !!newMember.communicationDisabledUntilTimestamp && newMember.communicationDisabledUntilTimestamp > Date.now();
		if (!wasTimedOut && isTimedOut) {
			// /timeout logs the rich entry itself; the event echo is suppressed.
			if (!consumeSuppressed(newMember.guild.id, 'mod.timeout', newMember.id)) {
				const until = newMember.communicationDisabledUntil ? `<t:${Math.floor(newMember.communicationDisabledUntil.getTime() / 1000)}:R>` : 'unknown';
				await sendLog(newMember.guild, 'mod.timeout', {
					description: `**${tag}** (<@${newMember.id}>) was timed out until ${until}.`,
					targetId: newMember.id,
					isBot: newMember.user.bot
				});
			}
		} else if (wasTimedOut && !isTimedOut) {
			await sendLog(newMember.guild, 'mod.untimeout', {
				description: `**${tag}** (<@${newMember.id}>) timeout was removed.`,
				targetId: newMember.id,
				isBot: newMember.user.bot
			});
		}

		// Boost (covers premiumSince added/removed)
		if (oldMember.premiumSinceTimestamp !== newMember.premiumSinceTimestamp) {
			const started = !oldMember.premiumSinceTimestamp && newMember.premiumSinceTimestamp;
			await sendLog(newMember.guild, 'member.boost', {
				description: started
					? `**${tag}** (<@${newMember.id}>) started boosting! 🚀`
					: `**${tag}** (<@${newMember.id}>) stopped boosting.`,
				targetId: newMember.id,
				isBot: newMember.user.bot
			});
		}

		// Roles (mute-role changes double as mute/unmute logs)
		const oldRoles = new Set(oldMember.roles.cache.keys());
		const newRoles = new Set(newMember.roles.cache.keys());
		const added = [...newRoles].filter((r) => !oldRoles.has(r));
		const removed = [...oldRoles].filter((r) => !newRoles.has(r));
		if (added.length > 0 || removed.length > 0) {
			const parts: string[] = [];
			if (added.length > 0) parts.push(`+${added.map((r) => `<@&${r}>`).join(' ')}`);
			if (removed.length > 0) parts.push(`-${removed.map((r) => `<@&${r}>`).join(' ')}`);
			await sendLog(newMember.guild, 'member.roles', {
				description: `**${tag}** (<@${newMember.id}>) roles updated: ${parts.join('  ')}`,
				targetId: newMember.id,
				roleIds: [...added, ...removed],
				isBot: newMember.user.bot
			});
		}
	}
}
