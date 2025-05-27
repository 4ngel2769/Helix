import fs from 'fs/promises';
import path from 'path';
import { Guild } from '../../models/Guild';

// Types for automod filters
interface KeywordCategory {
  [category: string]: string[];
}

interface AutomodPresets {
  presets: {
    [presetName: string]: KeywordCategory;
  };
}

/**
 * Loads automod filters from the configuration file
 */
export async function loadAutomodFilters(): Promise<AutomodPresets> {
  try {
    const filePath = path.join(process.cwd(), 'src', 'config', 'automod-filters.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error loading automod filters:', error);
    // Return empty defaults if file can't be loaded
    return { presets: { low: {}, medium: {}, high: {} } };
  }
}

/**
 * Get keywords for a specific category by merging default and custom keywords
 */
export async function getKeywordsForGuild(
  guildId: string,
  category: string,
  preset: string
): Promise<string[]> {
  try {
    // Load default keywords from config file
    const automodFilters = await loadAutomodFilters();
    const defaultKeywords = automodFilters.presets[preset]?.[category] || [];
    
    // Get guild-specific custom keywords
    const guildData = await Guild.findOne({ guildId });
    const customKeywords = guildData?.automodKeywords?.[category as keyof typeof guildData.automodKeywords] || [];
    
    // Merge and deduplicate keywords
    const mergedKeywords = [...new Set([...defaultKeywords, ...customKeywords])];
    return mergedKeywords;
  } catch (error) {
    console.error(`Error getting keywords for guild ${guildId}, category ${category}:`, error);
    return [];
  }
}

/**
 * Add custom keywords to a guild's automod filters
 */
export async function addCustomKeywords(
  guildId: string,
  category: string,
  keywords: string[]
): Promise<boolean> {
  try {
    let guildData = await Guild.findOne({ guildId });
    
    if (!guildData) {
      guildData = new Guild({ guildId });
    }
    
    // Initialize automodKeywords if it doesn't exist
    if (!guildData.automodKeywords) {
      guildData.automodKeywords = {
        profanity: [],
        scams: [],
        phishing: [],
        custom: []
      };
    }
    
    // Get current keywords for the category
    const currentKeywords = guildData.automodKeywords[category as keyof typeof guildData.automodKeywords] || [];
    
    // Add new keywords (avoiding duplicates)
    const updatedKeywords = [...new Set([...currentKeywords, ...keywords])];
    
    // Update the keywords in the database
    guildData.automodKeywords[category as keyof typeof guildData.automodKeywords] = updatedKeywords;
    
    await guildData.save();
    return true;
  } catch (error) {
    console.error(`Error adding custom keywords for guild ${guildId}, category ${category}:`, error);
    return false;
  }
}

/**
 * Remove keywords from a guild's automod filters
 */
export async function removeCustomKeywords(
  guildId: string,
  category: string,
  keywords: string[]
): Promise<boolean> {
  try {
    const guildData = await Guild.findOne({ guildId });
    
    if (!guildData || !guildData.automodKeywords) {
      return false;
    }
    
    // Get current keywords for the category
    const currentKeywords = guildData.automodKeywords[category as keyof typeof guildData.automodKeywords] || [];
    
    // Filter out keywords to remove
    const updatedKeywords = currentKeywords.filter(kw => !keywords.includes(kw));
    
    // Update the keywords in the database
    guildData.automodKeywords[category as keyof typeof guildData.automodKeywords] = updatedKeywords;
    
    await guildData.save();
    return true;
  } catch (error) {
    console.error(`Error removing custom keywords for guild ${guildId}, category ${category}:`, error);
    return false;
  }
}

/**
 * Clear all keywords in a category for a guild
 */
export async function clearCustomKeywords(
  guildId: string,
  category: string
): Promise<boolean> {
  try {
    const guildData = await Guild.findOne({ guildId });
    
    if (!guildData || !guildData.automodKeywords) {
      return false;
    }
    
    // Clear the keywords for the category
    guildData.automodKeywords[category as keyof typeof guildData.automodKeywords] = [];
    
    await guildData.save();
    return true;
  } catch (error) {
    console.error(`Error clearing custom keywords for guild ${guildId}, category ${category}:`, error);
    return false;
  }
}