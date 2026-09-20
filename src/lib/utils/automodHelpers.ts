import { container } from '@sapphire/framework';
import {
    AutoModerationActionType,
    AutoModerationRuleEventType,
    AutoModerationRuleTriggerType,
    type Guild
} from 'discord.js';
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
        // NOTE: Discord rejects TIMEOUT on SPAM rules (only KEYWORD +
        // MENTION_SPAM), so this stays false — the builder enforces it too.
        timeout: false
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
        container.logger.error('Error loading keyword filters:', error);
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

/** Shared action builder — Discord only allows TIMEOUT on KEYWORD + MENTION_SPAM. */
export function buildPresetActions(    ruleName: string,
    logChannelId?: string,
    enableTimeout: boolean = false,
    timeoutDuration: number = 300,
    triggerType?: AutoModerationRuleTriggerType
): any[] {
    const actions: any[] = [
        {
            type: AutoModerationActionType.BlockMessage,
            metadata: { customMessage: `This message was blocked by AutoMod: Violation of rule "${ruleName}"` }
        }
    ];
    if (logChannelId) {
        actions.push({ type: AutoModerationActionType.SendAlertMessage, metadata: { channelId: logChannelId } });
    }
    if (
        enableTimeout &&
        (triggerType === AutoModerationRuleTriggerType.Keyword || triggerType === AutoModerationRuleTriggerType.MentionSpam)
    ) {
        actions.push({ type: AutoModerationActionType.Timeout, metadata: { durationSeconds: timeoutDuration } });
    }
    return actions;
}

export interface PresetInstallResult {
    created: string[];
    failed: Array<{ name: string; reason: string }>;
}

/** Install a keyword preset as native Discord rules. Used by /automod and the dashboard. */
export async function installPresetRules(
    guild: Guild,
    preset: string,
    guildId: string,
    logChannelId?: string,
    auditReason?: string
): Promise<PresetInstallResult> {
    const existingRules = await guild.autoModerationRules.fetch();
    const existingTriggerTypes = new Set<number>();
    existingRules.forEach((rule) => existingTriggerTypes.add(rule.triggerType));

    const presetRules = await getPresetRules(preset, guildId);
    const created: string[] = [];
    const failed: Array<{ name: string; reason: string }> = [];

    for (const ruleConfig of presetRules) {
        if (isLimitedTriggerType(ruleConfig.triggerType) && existingTriggerTypes.has(ruleConfig.triggerType)) {
            failed.push({
                name: ruleConfig.name,
                reason: `Server already has a rule of type ${getTriggerTypeName(ruleConfig.triggerType)} (limited to 1 per server)`
            });
            continue;
        }
        try {
            const rule = await guild.autoModerationRules.create({
                name: ruleConfig.name,
                eventType: AutoModerationRuleEventType.MessageSend,
                triggerType: ruleConfig.triggerType,
                triggerMetadata: ruleConfig.triggerMetadata as never,
                actions: buildPresetActions(ruleConfig.name, logChannelId, ruleConfig.timeout, ruleConfig.timeoutDuration || 300, ruleConfig.triggerType) as never,
                enabled: true,
                reason: auditReason ?? `Preset ${preset} install`
            });
            created.push(rule.name);
            existingTriggerTypes.add(ruleConfig.triggerType);
        } catch (error) {
            container.logger.error(`Failed to create rule ${ruleConfig.name}:`, error);
            failed.push({ name: ruleConfig.name, reason: 'Discord rejected the rule (limit or permissions)' });
        }
    }
    return { created, failed };
}
