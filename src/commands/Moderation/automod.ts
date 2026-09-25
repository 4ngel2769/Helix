import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { 
    PermissionFlagsBits,
    EmbedBuilder,
    ColorResolvable,
    MessageFlags,
    ChannelType,
    AutoModerationRuleEventType,
    AutoModerationRuleTriggerType,
    AutoModerationActionType
} from 'discord.js';
import { ErrorHandler } from '../../lib/structures/ErrorHandler';
import config from '../../config';
import { Guild, type AutomodAction, type AutomodFilter, type CustomAutomodSettings } from '../../models/Guild';
import { channelScope, roleScope, scopeTarget } from '../../lib/utils/scopedRules';
import { clearGuildAutomation } from '../../lib/utils/guildAutomationCache';
import { 
    loadAutomodFilters,
    addCustomKeywords,
    removeCustomKeywords,
    clearCustomKeywords
} from '../../lib/utils/automodUtils';
import {
    buildPresetActions,
    capitalizeFirstLetter,
    getPresetName,
    getTriggerTypeName,
    installPresetRules
} from '../../lib/utils/automodHelpers';

type KeywordSubcommand = 'list' | 'add' | 'remove' | 'clear';
type MainSubcommand = 'list' | 'create' | 'delete' | 'install';
type ScopeSubcommand = 'list' | 'exempt' | 'action' | 'clear';

interface TriggerConfigResult {
    triggerType: AutoModerationRuleTriggerType;
    triggerMetadata: Record<string, unknown>;
}

import { HybridModuleCommand } from '../../lib/structures/HybridCommand';

@ApplyOptions<Command.Options>({
    name: 'automod',
    description: 'Manage Discord AutoMod rules',
    preconditions: ['GuildOnly', 'ModeratorOnly']
})
export class AutoModCommand extends HybridModuleCommand<ModerationModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Moderation',
            description: 'Manage Discord AutoMod rules',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('automod')
                .setDescription('Manage Discord AutoMod rules')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('list')
                        .setDescription('List all AutoMod rules in the server')
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('create')
                        .setDescription('Create a new AutoMod rule')
                        .addStringOption((option) =>
                            option
                                .setName('name')
                                .setDescription('Name for the rule')
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('type')
                                .setDescription('Type of rule to create')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Keyword Filter', value: 'keyword' },
                                    { name: 'Spam Filter', value: 'spam' },
                                    { name: 'Mention Spam', value: 'mention_spam' },
                                    { name: 'Link Filter', value: 'link' }
                                )
                        )
                        .addStringOption((option) =>
                            option
                                .setName('keywords')
                                .setDescription('Keywords to filter (comma separated, only for keyword filter)')
                                .setRequired(false)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('mention_limit')
                                .setDescription('Maximum mentions allowed (only for mention spam)')
                                .setRequired(false)
                                .setMinValue(2)
                                .setMaxValue(50)
                        )
                        .addChannelOption((option) =>
                            option
                                .setName('log_channel')
                                .setDescription('Channel to log rule violations')
                                .setRequired(false)
                        )
                        .addBooleanOption((option) =>
                            option
                                .setName('timeout')
                                .setDescription('Timeout users who violate this rule')
                                .setRequired(false)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('install')
                        .setDescription('Install preset AutoMod rules')
                        .addStringOption((option) =>
                            option
                                .setName('preset')
                                .setDescription('Preset level of moderation to install')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Low - Basic Protection', value: 'low' },
                                    { name: 'Medium - Standard Protection', value: 'medium' },
                                    { name: 'High - Strict Protection', value: 'high' }
                                )
                        )
                        .addChannelOption((option) =>
                            option
                                .setName('log_channel')
                                .setDescription('Channel to log rule violations')
                                .setRequired(false)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('delete')
                        .setDescription('Delete an AutoMod rule')
                        .addStringOption((option) =>
                            option
                                .setName('rule_id')
                                .setDescription('ID of the rule to delete')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
                .addSubcommandGroup((group) =>
                    group
                        .setName('keywords')
                        .setDescription('Manage AutoMod keyword filters')
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('list')
                                .setDescription('List custom keywords for a category')
                                .addStringOption((option) =>
                                    option
                                        .setName('category')
                                        .setDescription('Keyword category to list')
                                        .setRequired(true)
                                        .addChoices(
                                            { name: 'Profanity', value: 'profanity' },
                                            { name: 'Scams', value: 'scams' },
                                            { name: 'Phishing', value: 'phishing' },
                                            { name: 'Custom', value: 'custom' }
                                        )
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('add')
                                .setDescription('Add custom keywords to a category')
                                .addStringOption((option) =>
                                    option
                                        .setName('category')
                                        .setDescription('Keyword category')
                                        .setRequired(true)
                                        .addChoices(
                                            { name: 'Profanity', value: 'profanity' },
                                            { name: 'Scams', value: 'scams' },
                                            { name: 'Phishing', value: 'phishing' },
                                            { name: 'Custom', value: 'custom' }
                                        )
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('keywords')
                                        .setDescription('Keywords to add (comma separated)')
                                        .setRequired(true)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('remove')
                                .setDescription('Remove custom keywords from a category')
                                .addStringOption((option) =>
                                    option
                                        .setName('category')
                                        .setDescription('Keyword category')
                                        .setRequired(true)
                                        .addChoices(
                                            { name: 'Profanity', value: 'profanity' },
                                            { name: 'Scams', value: 'scams' },
                                            { name: 'Phishing', value: 'phishing' },
                                            { name: 'Custom', value: 'custom' }
                                        )
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('keywords')
                                        .setDescription('Keywords to remove (comma separated)')
                                        .setRequired(true)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('clear')
                                .setDescription('Clear all custom keywords from a category')
                                .addStringOption((option) =>
                                    option
                                        .setName('category')
                                        .setDescription('Keyword category to clear')
                                        .setRequired(true)
                                        .addChoices(
                                            { name: 'Profanity', value: 'profanity' },
                                            { name: 'Scams', value: 'scams' },
                                            { name: 'Phishing', value: 'phishing' },
                                            { name: 'Custom', value: 'custom' }
                                        )
                                )
                                .addBooleanOption((option) =>
                                    option
                                        .setName('confirm')
                                        .setDescription('Confirm that you want to clear all keywords')
                                        .setRequired(true)
                                )
                        )
                )
                .addSubcommandGroup((group) =>
                    group
                        .setName('scope')
                        .setDescription('Per-channel / per-role Helix filter rules')
                        .addSubcommand((sub) => sub.setName('list').setDescription('List every channel/role override'))
                        .addSubcommand((sub) =>
                            sub
                                .setName('exempt')
                                .setDescription('Exempt (or un-exempt) a channel/role from Helix AutoMod')
                                .addChannelOption((o) => o.setName('channel').setDescription('Channel to scope').addChannelTypes(ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement))
                                .addRoleOption((o) => o.setName('role').setDescription('Role to scope'))
                                .addBooleanOption((o) => o.setName('exempt').setDescription('true = skip Helix AutoMod here').setRequired(true))
                        )
                        .addSubcommand((sub) =>
                            sub
                                .setName('action')
                                .setDescription('Set the punishment for one Helix filter in a channel/role')
                                .addChannelOption((o) => o.setName('channel').setDescription('Channel to scope').addChannelTypes(ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement))
                                .addRoleOption((o) => o.setName('role').setDescription('Role to scope'))
                                .addStringOption((o) =>
                                    o
                                        .setName('filter')
                                        .setDescription('Which Helix filter')
                                        .setRequired(true)
                                        .addChoices(
                                            { name: 'Invites', value: 'invites' },
                                            { name: 'Links', value: 'links' },
                                            { name: 'Caps', value: 'caps' },
                                            { name: 'Emoji', value: 'emoji' },
                                            { name: 'Spam', value: 'spam' },
                                            { name: 'Repeat', value: 'repeat' },
                                            { name: 'Spoilers', value: 'spoilers' },
                                            { name: 'Attachments', value: 'attachments' },
                                            { name: 'Zalgo', value: 'zalgo' }
                                        )
                                )
                                .addStringOption((o) =>
                                    o
                                        .setName('action')
                                        .setDescription('What to do on a hit')
                                        .setRequired(true)
                                        .addChoices(
                                            { name: 'Delete only', value: 'delete' },
                                            { name: 'Delete + warn', value: 'delete_warn' },
                                            { name: 'Delete + timeout', value: 'delete_timeout' },
                                            { name: 'Delete + kick', value: 'delete_kick' },
                                            { name: 'Delete + ban', value: 'delete_ban' }
                                        )
                                )
                        )
                        .addSubcommand((sub) =>
                            sub
                                .setName('clear')
                                .setDescription('Remove every override for a channel/role')
                                .addChannelOption((o) => o.setName('channel').setDescription('Channel to scope').addChannelTypes(ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement))
                                .addRoleOption((o) => o.setName('role').setDescription('Role to scope'))
                        )
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return ErrorHandler.sendPermissionError(interaction, 'ManageGuild');
        }

        const subcommandGroup = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();

        if (subcommandGroup === 'keywords') {
            return this.handleKeywordSubcommand(interaction, subcommand as KeywordSubcommand);
        }

        if (subcommandGroup === 'scope') {
            return this.handleScopeSubcommand(interaction, subcommand as ScopeSubcommand);
        }

        return this.handleMainSubcommand(interaction, subcommand as MainSubcommand);
    }

    /** `/automod scope` — per-channel / per-role Helix filter rules. */
    private async handleScopeSubcommand(interaction: Command.ChatInputCommandInteraction, subcommand: ScopeSubcommand) {
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        const target = channel ? { key: channelScope(channel.id), label: `<#${channel.id}>`, kind: 'channel' as const } : role ? { key: roleScope(role.id), label: `<@&${role.id}>`, kind: 'role' as const } : null;
        if (subcommand !== 'list' && !target) {
            return interaction.reply({ content: 'Pick either a `channel` or a `role`.', flags: MessageFlags.Ephemeral });
        }

        if (subcommand === 'list') {
            return this.handleListScopes(interaction);
        }

        const guildId = interaction.guildId!;
        const doc = await Guild.findOne({ guildId });
        if (!doc) return interaction.reply({ content: 'No guild settings found.', flags: MessageFlags.Ephemeral });

        const automodSettings = (doc.automodSettings ?? {}) as CustomAutomodSettings;
        const overrides = { ...(automodSettings.overrides ?? {}) };
        const current = overrides[target!.key] ?? {};

        if (subcommand === 'clear') {
            if (!overrides[target!.key]) {
                return interaction.reply({ content: `${target!.label} has no overrides.`, flags: MessageFlags.Ephemeral });
            }
            delete overrides[target!.key];
        } else if (subcommand === 'exempt') {
            const exempt = interaction.options.getBoolean('exempt', true);
            overrides[target!.key] = { ...current, exempt };
        } else {
            const filter = interaction.options.getString('filter', true) as AutomodFilter;
            const nextAction = interaction.options.getString('action', true) as AutomodAction;
            overrides[target!.key] = {
                ...current,
                exempt: current.exempt,
                settings: { ...(current.settings ?? {}), actions: { ...(current.settings?.actions ?? {}), [filter]: nextAction } }
            };
        }

        doc.automodSettings = { ...automodSettings, overrides };
        await doc.save();
        clearGuildAutomation(guildId);

        const done =
            subcommand === 'clear'
                ? `Cleared Helix filter overrides for ${target!.label}.`
                : subcommand === 'exempt'
                  ? `${target!.label} is now ${overrides[target!.key]?.exempt ? 'exempt from' : 'subject to'} Helix AutoMod.`
                  : `Helix filter \`${interaction.options.getString('filter', true)}\` in ${target!.label} now runs \`${interaction.options.getString('action', true)}\`.`;
        return interaction.reply({ content: done, flags: MessageFlags.Ephemeral });
    }

    private async handleListScopes(interaction: Command.ChatInputCommandInteraction) {
        const doc = await Guild.findOne({ guildId: interaction.guildId! }, { automodSettings: 1 }).lean();
        const overrides = ((doc?.automodSettings ?? {}) as CustomAutomodSettings).overrides ?? {};
        const keys = Object.keys(overrides);
        if (keys.length === 0) {
            return interaction.reply({ content: 'No per-channel or per-role Helix filter overrides.', flags: MessageFlags.Ephemeral });
        }
        const lines = keys.slice(0, 25).map((key) => {
            const id = scopeTarget(key) ?? key;
            const rule = overrides[key] ?? {};
            const actions = Object.entries(rule.settings?.actions ?? {})
                .map(([filter, value]) => `${filter}: ${value}`)
                .join(', ');
            return `• ${key.startsWith('c:') ? `<#${id}>` : `<@&${id}>`}${rule.exempt ? ' — **exempt**' : ''}${actions ? ` — ${actions}` : ''}`;
        });
        return interaction.reply({ content: `Helix filter overrides (${keys.length}):\n${lines.join('\n')}`, flags: MessageFlags.Ephemeral });
    }

    private async handleKeywordSubcommand(
        interaction: Command.ChatInputCommandInteraction,
        subcommand: KeywordSubcommand
    ) {
        switch (subcommand) {
            case 'list':
                return this.handleListKeywords(interaction);
            case 'add':
                return this.handleAddKeywords(interaction);
            case 'remove':
                return this.handleRemoveKeywords(interaction);
            case 'clear':
                return this.handleClearKeywords(interaction);
            default:
                return interaction.reply({
                    content: 'Invalid subcommand.',
                    flags: MessageFlags.Ephemeral
                });
        }
    }

    private async handleMainSubcommand(
        interaction: Command.ChatInputCommandInteraction,
        subcommand: MainSubcommand
    ) {
        switch (subcommand) {
            case 'list':
                return this.handleListRules(interaction);
            case 'create':
                return this.handleCreateRule(interaction);
            case 'delete':
                return this.handleDeleteRule(interaction);
            case 'install':
                return this.handleInstallPreset(interaction);
            default:
                return interaction.reply({
                    content: 'Invalid subcommand.',
                    flags: MessageFlags.Ephemeral
                });
        }
    }

    private parseKeywordsInput(keywordsInput: string): string[] {
        return keywordsInput
            .split(',')
            .map((keyword) => keyword.trim())
            .filter(Boolean);
    }

    private getTriggerConfig(
        type: string,
        keywords: string | null,
        mentionLimit: number | null
    ): { error?: string; config?: TriggerConfigResult } {
        switch (type) {
            case 'keyword': {
                if (!keywords) {
                    return { error: 'Keywords are required for keyword filter rules.' };
                }

                return {
                    config: {
                        triggerType: AutoModerationRuleTriggerType.Keyword,
                        triggerMetadata: { keywordFilter: this.parseKeywordsInput(keywords) }
                    }
                };
            }
            case 'spam':
                return {
                    config: {
                        triggerType: AutoModerationRuleTriggerType.Spam,
                        triggerMetadata: {}
                    }
                };
            case 'mention_spam': {
                if (!mentionLimit) {
                    return { error: 'Mention limit is required for mention spam rules.' };
                }

                return {
                    config: {
                        triggerType: AutoModerationRuleTriggerType.MentionSpam,
                        triggerMetadata: { mentionTotalLimit: mentionLimit }
                    }
                };
            }
            case 'link':
                return {
                    config: {
                        triggerType: AutoModerationRuleTriggerType.Keyword,
                        triggerMetadata: { keywordFilter: ['http://', 'https://'] }
                    }
                };
            default:
                return { error: 'Invalid rule type.' };
        }
    }

    private async handleListRules(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const rules = await interaction.guild!.autoModerationRules.fetch();

            if (rules.size === 0) {
                return interaction.editReply({
                    content: 'No AutoMod rules found in this server.'
                });
            }

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle('ðŸ“‹ AutoMod Rules')
                .setDescription(`This server has ${rules.size} AutoMod rules configured.`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            rules.forEach(rule => {
                let triggerInfo = 'Unknown trigger type';
                
                switch (rule.triggerType) {
                    case AutoModerationRuleTriggerType.Keyword:
                        triggerInfo = `Keywords: ${rule.triggerMetadata.keywordFilter?.join(', ') || 'None'}`;
                        break;
                    case AutoModerationRuleTriggerType.Spam:
                        triggerInfo = 'Anti-Spam';
                        break;
                    case AutoModerationRuleTriggerType.MentionSpam:
                        triggerInfo = `Max Mentions: ${rule.triggerMetadata.mentionTotalLimit || 'Not set'}`;
                        break;
                    case AutoModerationRuleTriggerType.KeywordPreset:
                        triggerInfo = `Preset: ${rule.triggerMetadata.presets?.join(', ') || 'None'}`;
                        break;
                }

                const actions = rule.actions.map(action => {
                    switch (action.type) {
                        case AutoModerationActionType.BlockMessage:
                            return 'Block Message';
                        case AutoModerationActionType.SendAlertMessage:
                            return `Alert in <#${action.metadata.channelId}>`;
                        case AutoModerationActionType.Timeout:
                            return `Timeout (${action.metadata.durationSeconds}s)`;
                        default:
                            return 'Unknown Action';
                    }
                }).join(', ');

                embed.addFields({
                    name: `${rule.name} (${rule.id})`,
                    value: `**Type:** ${getTriggerTypeName(rule.triggerType)}\n**Details:** ${triggerInfo}\n**Actions:** ${actions}\n**Enabled:** ${rule.enabled ? 'âœ…' : 'âŒ'}`,
                    inline: false
                });
            });

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            this.container.logger.error('Error fetching AutoMod rules:', error);
            return interaction.editReply({
                content: 'Failed to fetch AutoMod rules. Make sure the bot has the necessary permissions.'
            });
        }
    }

    private async handleCreateRule(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const name = interaction.options.getString('name', true);
        const type = interaction.options.getString('type', true);
        const keywords = interaction.options.getString('keywords');
        const mentionLimit = interaction.options.getInteger('mention_limit');
        const logChannel = interaction.options.getChannel('log_channel');
        const enableTimeout = interaction.options.getBoolean('timeout') || false;

        try {
            const triggerConfig = this.getTriggerConfig(type, keywords, mentionLimit);
            if (triggerConfig.error || !triggerConfig.config) {
                return interaction.editReply({ content: triggerConfig.error ?? 'Invalid rule type.' });
            }
            if (enableTimeout && triggerConfig.config.triggerType !== AutoModerationRuleTriggerType.Keyword && triggerConfig.config.triggerType !== AutoModerationRuleTriggerType.MentionSpam) {
                return interaction.editReply({ content: 'Discord only allows the timeout action on keyword and mention-spam rules â€” pick one of those types or turn timeout off.' });
            }

            const actions = buildPresetActions(name, logChannel?.id, enableTimeout, 300, triggerConfig.config.triggerType);

            // Create the rule
            const rule = await interaction.guild!.autoModerationRules.create({
                name,
                eventType: AutoModerationRuleEventType.MessageSend,
                triggerType: triggerConfig.config.triggerType,
                triggerMetadata: triggerConfig.config.triggerMetadata,
                actions,
                enabled: true,
                reason: `Created by ${interaction.user.tag} via bot command`
            });

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('âœ… AutoMod Rule Created')
                .setDescription(`Successfully created AutoMod rule "${name}"`)
                .addFields(
                    { name: 'Rule ID', value: rule.id, inline: true },
                    { name: 'Type', value: getTriggerTypeName(triggerConfig.config.triggerType), inline: true }
                )
                .setFooter({ text: `Created by ${interaction.user.tag}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            this.container.logger.error('Error creating AutoMod rule:', error);
            return interaction.editReply({
                content: 'Failed to create AutoMod rule. Make sure the bot has the necessary permissions.'
            });
        }
    }

    private async handleDeleteRule(interaction: Command.ChatInputCommandInteraction) {
        const ruleId = interaction.options.getString('rule_id', true);

        try {
            await interaction.guild!.autoModerationRules.delete(ruleId, `Deleted by ${interaction.user.tag} via bot command`);

            return interaction.reply({
                content: `Successfully deleted AutoMod rule with ID: ${ruleId}`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            this.container.logger.error('Error deleting AutoMod rule:', error);
            return interaction.reply({
                content: 'Failed to delete AutoMod rule. Make sure the rule ID is valid and the bot has the necessary permissions.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    private async handleInstallPreset(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const preset = interaction.options.getString('preset', true);
        const logChannel = interaction.options.getChannel('log_channel');
        const guildId = interaction.guildId!;
        
        try {
            const { created, failed } = await installPresetRules(
                interaction.guild!,
                preset,
                guildId,
                logChannel?.id,
                `Created by ${interaction.user.tag} via bot command (preset: ${preset})`
            );
            const createdRules = created.map((name) => ({ name }));
            const failedRules = failed.map((f) => ({ name: f.name, reason: f.reason }));

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('âœ… AutoMod Preset Installation')
                .setDescription(`Installed the **${getPresetName(preset)}** preset with ${createdRules.length} rules.`);
            
            if (createdRules.length > 0) {
                embed.addFields({
                    name: 'Rules Created', 
                    value: createdRules.map(rule => `â€¢ ${rule.name}`).join('\n'), 
                    inline: false
                });
            }
                
            if (failedRules.length > 0) {
                embed.addFields({
                    name: 'âŒ Failed Rules', 
                    value: failedRules.map(rule => `â€¢ ${rule.name}: ${rule.reason}`).join('\n'), 
                    inline: false
                });
            }
                
            embed.setFooter({ text: `Created by ${interaction.user.tag}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            this.container.logger.error('Error installing AutoMod preset:', error);
            return interaction.editReply({
                content: 'Failed to install AutoMod preset. Make sure the bot has the necessary permissions.'
            });
        }
    }

    // For autocomplete on rule IDs
    public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
        if (interaction.commandName !== 'automod' || interaction.options.getSubcommand() !== 'delete') return;
        try {
            const rules = await interaction.guild!.autoModerationRules.fetch();
            const choices = rules.map(rule => ({
                name: `${rule.name} (${rule.id})`,
                value: rule.id
            }));

            return interaction.respond(choices);
        } catch (error) {
            this.container.logger.error('Error in autocomplete:', error);
            return interaction.respond([]);
        }
    }

    private async handleListKeywords(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const category = interaction.options.getString('category', true);
        const guildId = interaction.guildId!;
        
        try {
            // Load default keywords from config file
            const automodFilters = await loadAutomodFilters();
            const defaultKeywords = Object.entries(automodFilters.presets).map(([presetName, presetData]) => ({
                preset: presetName,
                keywords: presetData[category] || []
            }));
            
            // Get guild-specific custom keywords
            const guildData = await Guild.findOne({ guildId });
            const customKeywords = guildData?.automodKeywords?.[category as keyof typeof guildData.automodKeywords] || [];
            
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle(`ðŸ” AutoMod Keywords: ${capitalizeFirstLetter(category)}`)
                .setDescription(`Keywords configured for the ${category} filter`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();
            
            // Add custom keywords field if any exist
            if (customKeywords.length > 0) {
                embed.addFields({
                    name: 'ðŸ“ Custom Keywords',
                    value: customKeywords.join(', ') || 'None',
                    inline: false
                });
            } else {
                embed.addFields({
                    name: 'ðŸ“ Custom Keywords',
                    value: 'No custom keywords configured',
                    inline: false
                });
            }
            
            // Add default keywords by preset
            defaultKeywords.forEach(({ preset, keywords }) => {
                if (keywords.length > 0) {
                    embed.addFields({
                        name: `ðŸ”§ Default ${capitalizeFirstLetter(preset)} Preset`,
                        value: keywords.join(', '),
                        inline: false
                    });
                }
            });
            
            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            this.container.logger.error('Error listing keywords:', error);
            return interaction.editReply({
                content: 'An error occurred while retrieving keywords.'
            });
        }
    }

    private async handleAddKeywords(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const category = interaction.options.getString('category', true);
        const keywordsInput = interaction.options.getString('keywords', true);
        const guildId = interaction.guildId!;
        
        try {
            const keywords = this.parseKeywordsInput(keywordsInput);
            
            if (keywords.length === 0) {
                return interaction.editReply({
                    content: 'No valid keywords provided.'
                });
            }
            
            // Add the keywords
            const success = await addCustomKeywords(guildId, category, keywords);
            
            if (success) {
                return interaction.editReply({
                    content: `âœ… Successfully added ${keywords.length} keywords to the ${category} filter.`
                });
            } else {
                return interaction.editReply({
                    content: 'âŒ Failed to add keywords. Please try again later.'
                });
            }
        } catch (error) {
            this.container.logger.error('Error adding keywords:', error);
            return interaction.editReply({
                content: 'An error occurred while adding keywords.'
            });
        }
    }

    private async handleRemoveKeywords(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const category = interaction.options.getString('category', true);
        const keywordsInput = interaction.options.getString('keywords', true);
        const guildId = interaction.guildId!;
        
        try {
            const keywords = this.parseKeywordsInput(keywordsInput);
            
            if (keywords.length === 0) {
                return interaction.editReply({
                    content: 'No valid keywords provided.'
                });
            }
            
            // Remove the keywords
            const success = await removeCustomKeywords(guildId, category, keywords);
            
            if (success) {
                return interaction.editReply({
                    content: `âœ… Successfully removed ${keywords.length} keywords from the ${category} filter.`
                });
            } else {
                return interaction.editReply({
                    content: 'âŒ Failed to remove keywords. Please try again later.'
                });
            }
        } catch (error) {
            this.container.logger.error('Error removing keywords:', error);
            return interaction.editReply({
                content: 'An error occurred while removing keywords.'
            });
        }
    }

    private async handleClearKeywords(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const category = interaction.options.getString('category', true);
        const confirmed = interaction.options.getBoolean('confirm', true);
        const guildId = interaction.guildId!;
        
        if (!confirmed) {
            return interaction.editReply({
                content: 'Operation cancelled. Set confirm to true if you want to clear all keywords.'
            });
        }
        
        try {
            // Clear the keywords
            const success = await clearCustomKeywords(guildId, category);
            
            if (success) {
                return interaction.editReply({
                    content: `âœ… Successfully cleared all custom keywords from the ${category} filter.`
                });
            } else {
                return interaction.editReply({
                    content: 'âŒ Failed to clear keywords. Please try again later.'
                });
            }
        } catch (error) {
            this.container.logger.error('Error clearing keywords:', error);
            return interaction.editReply({
                content: 'An error occurred while clearing keywords.'
            });
        }
    }

}