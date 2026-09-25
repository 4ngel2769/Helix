import { EmojiIdentifierResolvable } from 'discord.js';
import { emoji } from '../lib/embeds/format';

export interface ModuleConfig {
    name: string;
    description: string;
    emoji: EmojiIdentifierResolvable;
    defaultEnabled: boolean;
    requiredPermissions?: bigint[];
}

// Export a type for module keys to ensure type safety
export type ModuleKey = keyof typeof moduleConfigs;

// The main configuration object for all modules
//
// `emoji` used to be bare snowflakes ("899907091634978867") with a "replace with
// your own" comment. Those are not valid `EmojiIdentifierResolvable` — Discord
// expects `<:name:id>` — so every one of them rendered as a row of literal
// digits. They are unicode now, which always renders, and `moduleEmoji()` is the
// override point: drop a `modules.<key>` entry into src/emojimap.json to swap in
// a Helix custom emoji without touching this file.
export const moduleConfigs = {
    general: {
        name: 'General',
        description: 'Basic commands for everyone',
        emoji: '⚙️',
        defaultEnabled: true
    },
    moderation: {
        name: 'Moderation',
        description: 'Tools to moderate your server',
        emoji: '🛡️',
        defaultEnabled: true,
        requiredPermissions: [] as bigint[] // Fix by specifying as bigint[]
    },
    administration: {
        name: 'Administration',
        description: 'Server and bot administration commands',
        emoji: '🗂️',
        defaultEnabled: true,
        requiredPermissions: [] as bigint[] // Fix by specifying as bigint[]
    },
    fun: {
        name: 'Fun',
        description: 'Fun commands to liven up your server',
        emoji: '🎲',
        defaultEnabled: true
    },
    welcoming: {
        name: 'Welcoming',
        description: 'Welcome new members to your server',
        emoji: '👋',
        defaultEnabled: true
    },
    verification: {
        name: 'Verification',
        description: 'Verify new members before they can access your server',
        emoji: '✅',
        defaultEnabled: true
    },
    utility: {
        name: 'Utility',
        description: 'Helpful utility commands',
        emoji: '🔧',
        defaultEnabled: true
    },
    music: {
        name: 'Music',
        description: 'Play music in voice channels',
        emoji: '🎵',
        defaultEnabled: true
    },
    leveling: {
        name: 'Leveling',
        description: 'XP and level tracking system',
        emoji: '📈',
        defaultEnabled: false
    },
    developer: {
        name: 'Developer',
        description: 'Commands for bot developers',
        emoji: '🛠️',
        defaultEnabled: true
    },
    reactionRoles: {
        name: 'Reaction Roles',
        description: 'Assign roles based on reactions',
        emoji: '🎭',
        defaultEnabled: true
    },
    economy: {
        name: 'Economy',
        description: 'Economy module! (Very cool)',
        emoji: '💸',
        defaultEnabled: true
    },
} as const;

/**
 * Validates if an emoji is valid (Unicode emoji or Discord custom emoji ID format)
 * @param emoji The emoji to validate
 */
export function isValidEmoji(emoji: string): boolean {
    // Check if it's a Discord custom emoji ID format (<:name:id> or <a:name:id>)
    const discordEmojiPattern = /<a?:[a-zA-Z0-9_]+:[0-9]+>/;
    if (discordEmojiPattern.test(emoji)) return true;
    
    // Unicode emoji detection is complex, this is a simplified check
    // Most emoji are 1-2 characters in JS strings
    return emoji.length <= 2 || /\p{Emoji}/u.test(emoji);
}

/**
 * Module emoji, resolved through src/emojimap.json so `modules.<key>` in the
 * map overrides the unicode default without a code change. A brand profile can
 * later sit in front of this for per-server custom emoji.
 */
export function moduleEmoji(key: string): string {
    const fallback = getModuleConfig(key)?.emoji ?? '•';
    return emoji(`modules.${key.toLowerCase()}`, String(fallback));
}

/**
 * Get module configuration by key
 * @param key The module key to retrieve configuration for
 * @returns The module configuration or undefined if not found
 */
export function getModuleConfig(key: string): ModuleConfig | undefined {
    return moduleConfigs[key.toLowerCase() as keyof typeof moduleConfigs];
}

/**
 * Get a list of all module keys
 * @returns Array of all module keys
 */
export function getAllModuleKeys(): string[] {
    return Object.keys(moduleConfigs);
}

/**
 * Discord option/subcommand names must match /^[\p{Ll}\p{Lm}\p{Lo}\p{N}_-]+$/ —
 * lowercase only. `reactionRoles` is a legal module key but `setName('reactionRoles')`
 * throws inside @discordjs/builders, which silently drops the whole command from
 * registration. Always use this instead of the raw key for option names, on the
 * write side AND the `getString()` read side.
 *
 * ponytail: the persisted key stays `reactionRoles` so existing guild.modules
 * docs and the dashboard API need no migration. Renaming the key to
 * `reactionroles` is the alternative, but it breaks stored state.
 */
export function moduleOptionName(key: string): string {
    return key.toLowerCase();
}