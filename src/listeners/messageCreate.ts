import { Events, Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { getGuildAutomation } from '../lib/utils/guildAutomationCache';
import { announceLevelUp, awardXp, syncRoleRewards } from '../lib/utils/leveling';
import { handleCustomAutomod } from '../lib/utils/customAutomod';

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
        if (auto.moderationModuleOn) {
            try {
                if (await handleCustomAutomod(message, auto.automodSettings, { adminRoleId: auto.adminRoleId, modRoleId: auto.modRoleId })) return;
            } catch {
                // fall through to leveling — automod must never break chat
            }
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
			await syncRoleRewards(message.member, res.level, lv);
        } catch {
            // rewards are best-effort
        }

        try {
            await announceLevelUp(message.guild, message.author, res.level, res.xp, lv, { channel: message.channel });
        } catch {
            // announcing must never break chat
        }
    }
}
