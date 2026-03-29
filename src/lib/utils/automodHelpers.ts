import { AutoModerationRuleTriggerType } from 'discord.js';
import { getKeywordsForGuild } from './automodUtils';

export interface AutoModPresetRule {
    name: string;
    triggerType: AutoModerationRuleTriggerType;
    triggerMetadata: Record<string, unknown>;
    timeout: boolean;
    timeoutDuration?: number;
}

export function getPresetName(preset: string): string {
    switch (preset) {
        case 'low':
            return 'Low Protection';
        case 'medium':
            return 'Medium Protection';
        case 'high':
            return 'High Protection';
        default:
            return 'Custom';
    }
}

export async function getPresetRules(preset: string, guildId: string): Promise<AutoModPresetRule[]> {
    const rules: AutoModPresetRule[] = [];

    rules.push({
        name: 'Anti-Spam Protection',
        triggerType: AutoModerationRuleTriggerType.Spam,
        triggerMetadata: {},
        timeout: preset !== 'low'
    });

    try {
        const profanityKeywords = await getKeywordsForGuild(guildId, 'profanity', preset);
        const scamKeywords = await getKeywordsForGuild(guildId, 'scams', preset);
        const phishingKeywords = await getKeywordsForGuild(guildId, 'phishing', preset);
        const customKeywords = await getKeywordsForGuild(guildId, 'custom', preset);

        switch (preset) {
            case 'low':
                rules.push({
                    name: 'Mention Spam Protection',
                    triggerType: AutoModerationRuleTriggerType.MentionSpam,
                    triggerMetadata: { mentionTotalLimit: 10 },
                    timeout: false
                });

                if (profanityKeywords.length > 0) {
                    rules.push({
                        name: 'Basic Profanity Filter',
                        triggerType: AutoModerationRuleTriggerType.Keyword,
                        triggerMetadata: { keywordFilter: profanityKeywords },
                        timeout: false
                    });
                }
                break;

            case 'medium':
                rules.push({
                    name: 'Mention Spam Protection',
                    triggerType: AutoModerationRuleTriggerType.MentionSpam,
                    triggerMetadata: { mentionTotalLimit: 6 },
                    timeout: true,
                    timeoutDuration: 600
                });

                if (profanityKeywords.length > 0) {
                    rules.push({
                        name: 'Profanity Filter',
                        triggerType: AutoModerationRuleTriggerType.Keyword,
                        triggerMetadata: { keywordFilter: profanityKeywords },
                        timeout: false
                    });
                }

                if (scamKeywords.length > 0) {
                    rules.push({
                        name: 'Scam Filter',
                        triggerType: AutoModerationRuleTriggerType.Keyword,
                        triggerMetadata: { keywordFilter: scamKeywords },
                        timeout: true,
                        timeoutDuration: 1800
                    });
                }
                break;

            case 'high':
                rules.push({
                    name: 'Strict Mention Spam Protection',
                    triggerType: AutoModerationRuleTriggerType.MentionSpam,
                    triggerMetadata: { mentionTotalLimit: 4 },
                    timeout: true,
                    timeoutDuration: 1800
                });

                if (profanityKeywords.length > 0) {
                    rules.push({
                        name: 'Strict Profanity Filter',
                        triggerType: AutoModerationRuleTriggerType.Keyword,
                        triggerMetadata: { keywordFilter: profanityKeywords },
                        timeout: true,
                        timeoutDuration: 600
                    });
                }

                if (scamKeywords.length > 0) {
                    rules.push({
                        name: 'Strict Scam Filter',
                        triggerType: AutoModerationRuleTriggerType.Keyword,
                        triggerMetadata: { keywordFilter: scamKeywords },
                        timeout: true,
                        timeoutDuration: 3600
                    });
                }

                if (phishingKeywords.length > 0) {
                    rules.push({
                        name: 'Phishing Link Filter',
                        triggerType: AutoModerationRuleTriggerType.Keyword,
                        triggerMetadata: { keywordFilter: phishingKeywords },
                        timeout: true,
                        timeoutDuration: 3600
                    });
                }
                break;
        }

        if (customKeywords.length > 0) {
            rules.push({
                name: 'Custom Keyword Filter',
                triggerType: AutoModerationRuleTriggerType.Keyword,
                triggerMetadata: { keywordFilter: customKeywords },
                timeout: preset === 'high',
                timeoutDuration: preset === 'high' ? 600 : undefined
            });
        }

        return rules;
    } catch (error) {
        console.error('Error loading keyword filters:', error);
        return rules;
    }
}

export function getTriggerTypeName(triggerType: AutoModerationRuleTriggerType): string {
    switch (triggerType) {
        case AutoModerationRuleTriggerType.Keyword:
            return 'Keyword Filter';
        case AutoModerationRuleTriggerType.Spam:
            return 'Spam Filter';
        case AutoModerationRuleTriggerType.MentionSpam:
            return 'Mention Spam';
        case AutoModerationRuleTriggerType.KeywordPreset:
            return 'Keyword Preset';
        default:
            return 'Unknown';
    }
}

export function isLimitedTriggerType(triggerType: AutoModerationRuleTriggerType): boolean {
    return (
        triggerType === AutoModerationRuleTriggerType.Spam ||
        triggerType === AutoModerationRuleTriggerType.MentionSpam
    );
}

export function capitalizeFirstLetter(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
