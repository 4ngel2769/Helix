import { EmojiIdentifierResolvable } from 'discord.js';

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
        emoji: '899907091634978867', // Custom emoji ID for "moderation" (replace with your own)
        defaultEnabled: true,
        requiredPermissions: [] as bigint[] // Fix by specifying as bigint[]
    },
    administration: {
        name: 'Administration',
        description: 'Server and bot administration commands',
        emoji: '891086266442068028', // Custom emoji ID for "administration" (replace with your own)
        defaultEnabled: true,
        requiredPermissions: [] as bigint[] // Fix by specifying as bigint[]
    },
    fun: {
        name: 'Fun',
        description: 'Fun commands to liven up your server',
        emoji: '793067264814874654', // Custom emoji ID for "fun" (replace with your own)
        defaultEnabled: true
    },
    welcoming: {
        name: 'Welcoming',
        description: 'Welcome new members to your server',
        emoji: '969713121893687296', // Custom emoji ID for "welcoming" (replace with your own)
        defaultEnabled: true
    },
    verification: {
        name: 'Verification',
        description: 'Verify new members before they can access your server',
        emoji: '899908737467297812', // Custom emoji ID for "verification" (replace with your own)
        defaultEnabled: true
    },
    utility: {
        name: 'Utility',
        description: 'Helpful utility commands',
        emoji: '899908737698000976', // Custom emoji ID for "utility" (replace with your own)
        defaultEnabled: true
    },
    music: {
        name: 'Music',
        description: 'Play music in voice channels',
        emoji: '901302164004171787', // Custom emoji ID for "music" (replace with your own)
        defaultEnabled: true
    },
    economy: {
        name: 'Economy',
        description: 'Currency system for your server',
        emoji: '💰',
        defaultEnabled: false
    },
    leveling: {
        name: 'Leveling',
        description: 'XP and level tracking system',
        emoji: '466042779273920514', // Custom emoji ID for "leveling" (replace with your own)
        defaultEnabled: false
    },
    developer: {
        name: 'Developer',
        description: 'Commands for bot developers',
        emoji: '753658623065850036', // Custom emoji ID for "developer" (replace with your own)
        defaultEnabled: true
    }
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