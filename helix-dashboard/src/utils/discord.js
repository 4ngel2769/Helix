/**
 * Utility functions for Discord-related operations
 */

/**
 * Format a Discord snowflake ID as a timestamp
 * @param {string} snowflake Discord ID
 * @returns {Date} Timestamp when the ID was created
 */
export function getTimestampFromSnowflake(snowflake) {
  const epoch = 1420070400000; // Discord Epoch (2015-01-01)
  const binary = parseInt(snowflake).toString(2).padStart(64, '0');
  const timestamp = parseInt(binary.substring(0, 42), 2) + epoch;
  return new Date(timestamp);
}

/**
 * Get the complete avatar URL for a Discord user
 * @param {string} userId User ID
 * @param {string} avatarHash Avatar hash
 * @param {boolean} animated Whether the avatar is animated
 * @returns {string} Avatar URL
 */
export function getUserAvatarUrl(userId, avatarHash, animated = false) {
  if (!avatarHash) {
    return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
  }
  
  const extension = animated ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=256`;
}

/**
 * Get the server icon URL
 * @param {string} guildId Guild ID
 * @param {string} iconHash Icon hash
 * @param {boolean} animated Whether the icon is animated
 * @returns {string} Icon URL
 */
export function getGuildIconUrl(guildId, iconHash, animated = false) {
  if (!iconHash) {
    return null;
  }
  
  const extension = animated || iconHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${extension}?size=256`;
}

/**
 * Format a Discord permissions bitfield into human-readable permissions
 * @param {bigint|string} permissions Permissions as bigint or string
 * @returns {string[]} Array of permission names
 */
export function parsePermissions(permissions) {
  // Parse big integer permissions
  const permBig = typeof permissions === 'string' 
    ? BigInt(permissions) 
    : BigInt(permissions.toString());
    
  const permissionNames = {
    0n: 'CREATE_INSTANT_INVITE',
    1n: 'KICK_MEMBERS',
    2n: 'BAN_MEMBERS',
    3n: 'ADMINISTRATOR',
    4n: 'MANAGE_CHANNELS',
    5n: 'MANAGE_GUILD',
    6n: 'ADD_REACTIONS',
    7n: 'VIEW_AUDIT_LOG',
    8n: 'PRIORITY_SPEAKER',
    9n: 'STREAM',
    10n: 'VIEW_CHANNEL',
    11n: 'SEND_MESSAGES',
    12n: 'SEND_TTS_MESSAGES',
    13n: 'MANAGE_MESSAGES',
    14n: 'EMBED_LINKS',
    15n: 'ATTACH_FILES',
    16n: 'READ_MESSAGE_HISTORY',
    17n: 'MENTION_EVERYONE',
    18n: 'USE_EXTERNAL_EMOJIS',
    19n: 'VIEW_GUILD_INSIGHTS',
    20n: 'CONNECT',
    21n: 'SPEAK',
    22n: 'MUTE_MEMBERS',
    23n: 'DEAFEN_MEMBERS',
    24n: 'MOVE_MEMBERS',
    25n: 'USE_VAD',
    26n: 'CHANGE_NICKNAME',
    27n: 'MANAGE_NICKNAMES',
    28n: 'MANAGE_ROLES',
    29n: 'MANAGE_WEBHOOKS',
    30n: 'MANAGE_EMOJIS_AND_STICKERS',
    31n: 'USE_APPLICATION_COMMANDS',
    32n: 'REQUEST_TO_SPEAK',
    33n: 'MANAGE_EVENTS',
    34n: 'MANAGE_THREADS',
    35n: 'CREATE_PUBLIC_THREADS',
    36n: 'CREATE_PRIVATE_THREADS',
    37n: 'USE_EXTERNAL_STICKERS',
    38n: 'SEND_MESSAGES_IN_THREADS',
    39n: 'USE_EMBEDDED_ACTIVITIES',
    40n: 'MODERATE_MEMBERS',
    41n: 'VIEW_CREATOR_MONETIZATION_ANALYTICS',
    42n: 'USE_SOUNDBOARD',
    43n: 'USE_EXTERNAL_SOUNDS',
    44n: 'SEND_VOICE_MESSAGES',
  };

  const result = [];
  
  for (const [bit, name] of Object.entries(permissionNames)) {
    const bitValue = 1n << BigInt(bit);
    if ((permBig & bitValue) === bitValue) {
      result.push(name);
    }
  }
  
  return result;
}

/**
 * Parses an emoji string into name and ID components
 * @param {string} emoji Emoji string (unicode or <:name:id> format)
 * @returns {Object|null} Emoji object or null if invalid
 */
export function parseEmoji(emoji) {
  if (!emoji) return null;
  
  // Custom emoji format: <:name:id> or <a:name:id>
  const emojiMatch = emoji.match(/<(a)?:(\w+):(\d+)>/);
  
  if (emojiMatch) {
    return {
      animated: Boolean(emojiMatch[1]),
      name: emojiMatch[2],
      id: emojiMatch[3]
    };
  }
  
  // Unicode emoji
  return {
    name: emoji,
    id: null,
    animated: false
  };
}