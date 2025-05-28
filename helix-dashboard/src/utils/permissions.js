/**
 * Permission utility functions for the dashboard
 */

/**
 * Discord permission flags as BigInts for precise permission checking
 */
export const PermissionFlags = {
  // General permissions
  ADMINISTRATOR: 1n << 3n,
  MANAGE_GUILD: 1n << 5n,
  
  // Channel permissions
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_ROLES: 1n << 28n,
  
  // Message permissions
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  
  // Member management
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  MODERATE_MEMBERS: 1n << 40n
};

/**
 * Checks if a permission bitfield includes administrator privileges
 * @param {string|bigint} permissions Permission bitfield
 * @returns {boolean} Whether user has admin permissions
 */
export function hasAdministrator(permissions) {
  const permBigInt = typeof permissions === 'string' 
    ? BigInt(permissions) 
    : permissions;
    
  return (permBigInt & PermissionFlags.ADMINISTRATOR) === PermissionFlags.ADMINISTRATOR;
}

/**
 * Check if user has permission to manage a guild
 * @param {string|bigint} permissions Permission bitfield
 * @returns {boolean} Whether user can manage the guild
 */
export function canManageGuild(permissions) {
  const permBigInt = typeof permissions === 'string' 
    ? BigInt(permissions) 
    : permissions;
    
  return hasAdministrator(permBigInt) || 
    (permBigInt & PermissionFlags.MANAGE_GUILD) === PermissionFlags.MANAGE_GUILD;
}

/**
 * Check if user has permission to manage roles
 * @param {string|bigint} permissions Permission bitfield
 * @returns {boolean} Whether user can manage roles
 */
export function canManageRoles(permissions) {
  const permBigInt = typeof permissions === 'string' 
    ? BigInt(permissions) 
    : permissions;
    
  return hasAdministrator(permBigInt) ||
    (permBigInt & PermissionFlags.MANAGE_ROLES) === PermissionFlags.MANAGE_ROLES;
}

/**
 * Check if user can manage reaction roles
 * @param {string|bigint} permissions Permission bitfield
 * @returns {boolean} Whether user can manage reaction roles
 */
export function canManageReactionRoles(permissions) {
  return canManageRoles(permissions);
}

/**
 * Check if a user can manage the specified module
 * @param {string} moduleName Module name
 * @param {string|bigint} permissions User permissions 
 * @returns {boolean} Whether user has sufficient permissions
 */
export function canManageModule(moduleName, permissions) {
  const permBigInt = typeof permissions === 'string' 
    ? BigInt(permissions) 
    : permissions;
  
  if (hasAdministrator(permBigInt)) return true;
  
  const modulePermissions = {
    reactionRoles: [PermissionFlags.MANAGE_ROLES],
    moderation: [PermissionFlags.KICK_MEMBERS, PermissionFlags.BAN_MEMBERS, PermissionFlags.MODERATE_MEMBERS],
    administration: [PermissionFlags.MANAGE_GUILD],
    verification: [PermissionFlags.MANAGE_GUILD, PermissionFlags.MANAGE_ROLES]
  };
  
  const requiredPerms = modulePermissions[moduleName] || [];
  if (!requiredPerms.length) return false;
  
  // User needs at least one of the required permissions
  return requiredPerms.some(perm => (permBigInt & perm) === perm);
}