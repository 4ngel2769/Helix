/**
 * Form validation utility functions
 */

/**
 * Check if a string is empty or just whitespace
 * @param {string} value Value to check
 * @returns {boolean} True if empty or whitespace
 */
export function isEmpty(value) {
  return value === undefined || value === null || value.trim() === '';
}

/**
 * Validates a title field
 * @param {string} title Title to validate
 * @returns {Object} Validation result with status and message
 */
export function validateTitle(title) {
  if (isEmpty(title)) {
    return { isValid: false, message: 'Title is required' };
  }
  
  if (title.length > 256) {
    return { isValid: false, message: 'Title cannot exceed 256 characters' };
  }
  
  return { isValid: true };
}

/**
 * Validates a description field
 * @param {string} description Description to validate
 * @returns {Object} Validation result with status and message
 */
export function validateDescription(description) {
  if (isEmpty(description)) {
    return { isValid: false, message: 'Description is required' };
  }
  
  if (description.length > 4000) {
    return { isValid: false, message: 'Description cannot exceed 4000 characters' };
  }
  
  return { isValid: true };
}

/**
 * Validates roles array for a reaction roles menu
 * @param {Array} roles Array of role objects
 * @returns {Object} Validation result with status and message
 */
export function validateRoles(roles) {
  if (!Array.isArray(roles) || roles.length === 0) {
    return { isValid: false, message: 'At least one role is required' };
  }
  
  if (roles.length > 25) {
    return { isValid: false, message: 'Cannot have more than 25 roles in a menu (Discord limitation)' };
  }
  
  // Check for required fields in each role
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    
    if (!role.roleId) {
      return { isValid: false, message: `Role #${i + 1} is missing a role ID` };
    }
    
    if (isEmpty(role.label)) {
      return { isValid: false, message: `Role #${i + 1} is missing a label` };
    }
    
    if (role.label.length > 100) {
      return { isValid: false, message: `Label for role #${i + 1} cannot exceed 100 characters` };
    }
  }
  
  return { isValid: true };
}

/**
 * Validates a Discord ID
 * @param {string} id Discord ID to validate
 * @returns {boolean} Whether ID is valid
 */
export function isValidDiscordId(id) {
  return /^\d{17,20}$/.test(id);
}

/**
 * Validates an emoji for reaction roles
 * @param {string} emoji Emoji string or ID
 * @returns {Object} Validation result with status and message
 */
export function validateEmoji(emoji) {
  if (!emoji) {
    return { isValid: true }; // Emoji is optional
  }
  
  // Check for custom emoji format <:name:id> or <a:name:id>
  const customEmojiPattern = /<(a)?:(\w+):(\d{17,20})>/;
  
  if (customEmojiPattern.test(emoji)) {
    return { isValid: true };
  }
  
  // For unicode emoji, we simply check if it's not too long
  // A more precise check would need a Unicode emoji database
  if (emoji.length > 7) {
    return { isValid: false, message: 'Invalid emoji format' };
  }
  
  return { isValid: true };
}

/**
 * Validates a max selections value for reaction roles
 * @param {number} maxSelections Number of max selections
 * @param {number} roleCount Number of roles available
 * @returns {Object} Validation result
 */
export function validateMaxSelections(maxSelections, roleCount) {
  if (maxSelections === undefined || maxSelections === null) {
    return { isValid: true }; // Use default value
  }
  
  if (!Number.isInteger(maxSelections) || maxSelections < 0) {
    return { isValid: false, message: 'Max selections must be a non-negative integer' };
  }
  
  if (maxSelections > roleCount) {
    return { isValid: false, message: `Max selections cannot be greater than the number of roles (${roleCount})` };
  }
  
  return { isValid: true };
}