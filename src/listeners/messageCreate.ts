import { Events, Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { getGuildAutomation } from '../lib/utils/guildAutomationCache';
import { awardXp, renderLevelUpMessage } from '../lib/utils/leveling';
import { handleCustomAutomod } from '../lib/utils/customAutomod';
import type { LevelingSettings } from '../models/Guild';

const DEFAULT_LEVEL_MESSAGE = '🎉 {user} reached level {level}!';

async function applyRoleRewards(message: Message, level: number, lv: LevelingSettings): Promise<void> {
	const rewards = (lv.roleRewards ?? []).filter((r) => r.level <= level);
	if (rewards.length === 0 || !message.member) return;
	const earned = lv.stackRewards
		? rewards
		: [rewards.reduce((a, b) => (b.level > a.level ? b : a))];
	for (const reward of earned) {
		if (message.member.roles.cache.has(reward.roleId)) continue;
		await message.member.roles.add(reward.roleId, `Level ${level} reward`).catch(() => null);
	}
}

export class UserEvent extends Listener<typeof Events.MessageCreate> {
    public constructor(context: Listener.Context, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.MessageCreate
        });
    }

    public override async run(message: Message) {
        // Ignore bots, DMs and system messages.
        if (message.author.bot || !message.guild || !message.member || message.system) return;
        // Note: Mention-only responses are handled by mentionPrefixOnly.ts listener to avoid duplicate responses.

        let auto = null;
        try {
            auto = await getGuildAutomation(message.guild.id);
        } catch {
            return;
        }
        if (!auto) return;

        // 1. Helix custom filters first — handled messages earn no XP.
        try {
            if (await handleCustomAutomod(message, auto.automodSettings)) return;
        } catch {
            // fall through to leveling — automod must never break chat
        }

        // 2. Leveling / XP — single gate: the Leveling module toggle
        // (dashboard Modules page or /configmodule). No second switch.
        const lv = auto.leveling;
        if (!auto.levelingModuleOn) return;
        if (lv.ignoredChannels?.includes(message.channelId)) return;
        if ((lv.ignoredRoles?.length ?? 0) > 0 && message.member.roles.cache.some((r) => lv.ignoredRoles?.includes(r.id))) return;

        let res = null;
        try {
            res = await awardXp(message.guild.id, message.author.id, lv.xpMin ?? 15, lv.xpMax ?? 25, lv.cooldownSeconds ?? 60);
        } catch {
            return;
        }
        if (!res?.leveledUp) return;

        try {
            await applyRoleRewards(message, res.level, lv);
        } catch {
            // rewards are best-effort
        }

        try {
            const template = lv.levelUpMessage?.trim() || DEFAULT_LEVEL_MESSAGE;
            const text = renderLevelUpMessage(template, message.author.username, `<@${message.author.id}>`, res.level, res.xp);
            const channel = lv.levelUpChannelId
                ? await message.guild.channels.fetch(lv.levelUpChannelId).catch(() => null)
                : message.channel;
            if (channel && channel.isSendable()) await channel.send(text);
        } catch {
            // announcing must never break chat
        }
    }
}
