import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { 
    PermissionFlagsBits,
    EmbedBuilder,
    ColorResolvable,
    MessageFlags,
    AutoModerationRuleEventType,
    AutoModerationRuleTriggerType,
    AutoModerationActionType
} from 'discord.js';
import { ErrorHandler } from '../../lib/structures/ErrorHandler';
import config from '../../config';

@ApplyOptions<Command.Options>({
    name: 'automod',
    description: 'Manage Discord AutoMod rules',
    preconditions: ['GuildOnly', 'ModeratorOnly']
})
export class AutoModCommand extends ModuleCommand<ModerationModule> {
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
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        // Check if user has required permissions
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return ErrorHandler.sendPermissionError(interaction, 'ManageGuild');
        }

        const subcommand = interaction.options.getSubcommand();

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
                .setTitle('📋 AutoMod Rules')
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
                    value: `**Type:** ${this.getTriggerTypeName(rule.triggerType)}\n**Details:** ${triggerInfo}\n**Actions:** ${actions}\n**Enabled:** ${rule.enabled ? '✅' : '❌'}`,
                    inline: false
                });
            });

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching AutoMod rules:', error);
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
            // Set up rule creation options
            let triggerType: AutoModerationRuleTriggerType;
            const triggerMetadata: any = {};
            
            switch (type) {
                case 'keyword':
                    triggerType = AutoModerationRuleTriggerType.Keyword;
                    if (keywords) {
                        triggerMetadata.keywordFilter = keywords.split(',').map(k => k.trim());
                    } else {
                        return interaction.editReply({
                            content: 'Keywords are required for keyword filter rules.'
                        });
                    }
                    break;
                case 'spam':
                    triggerType = AutoModerationRuleTriggerType.Spam;
                    break;
                case 'mention_spam':
                    triggerType = AutoModerationRuleTriggerType.MentionSpam;
                    if (mentionLimit) {
                        triggerMetadata.mentionTotalLimit = mentionLimit;
                    } else {
                        return interaction.editReply({
                            content: 'Mention limit is required for mention spam rules.'
                        });
                    }
                    break;
                case 'link':
                    triggerType = AutoModerationRuleTriggerType.Keyword;
                    triggerMetadata.keywordFilter = ['http://', 'https://'];
                    break;
                default:
                    return interaction.editReply({
                        content: 'Invalid rule type.'
                    });
            }

            // Set up actions
            const actions: any[] = [];
            
            // Block message action
            actions.push({
                type: AutoModerationActionType.BlockMessage,
                metadata: { customMessage: `This message was blocked by AutoMod: Violation of rule "${name}"` }
            });
            
            // Log to channel if specified
            if (logChannel) {
                actions.push({
                    type: AutoModerationActionType.SendAlertMessage,
                    metadata: { channelId: logChannel.id }
                });
            }
            
            // Add timeout action if enabled
            if (enableTimeout) {
                actions.push({
                    type: AutoModerationActionType.Timeout,
                    metadata: { durationSeconds: 300 } // 5 minute timeout
                });
            }

            // Create the rule
            const rule = await interaction.guild!.autoModerationRules.create({
                name,
                eventType: AutoModerationRuleEventType.MessageSend,
                triggerType,
                triggerMetadata,
                actions,
                enabled: true,
                reason: `Created by ${interaction.user.tag} via bot command`
            });

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('✅ AutoMod Rule Created')
                .setDescription(`Successfully created AutoMod rule "${name}"`)
                .addFields(
                    { name: 'Rule ID', value: rule.id, inline: true },
                    { name: 'Type', value: this.getTriggerTypeName(triggerType), inline: true }
                )
                .setFooter({ text: `Created by ${interaction.user.tag}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error creating AutoMod rule:', error);
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
            console.error('Error deleting AutoMod rule:', error);
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
        
        try {
            const createdRules = [];
            const presetRules = this.getPresetRules(preset);
            
            // Create each rule in the preset
            for (const ruleConfig of presetRules) {
                // Set up actions
                const actions: any[] = [];
                
                // Block message action
                actions.push({
                    type: AutoModerationActionType.BlockMessage,
                    metadata: { customMessage: `This message was blocked by AutoMod: Violation of rule "${ruleConfig.name}"` }
                });
                
                // Log to channel if specified
                if (logChannel) {
                    actions.push({
                        type: AutoModerationActionType.SendAlertMessage,
                        metadata: { channelId: logChannel.id }
                    });
                }
                
                // Add timeout action if enabled in the preset rule
                if (ruleConfig.timeout) {
                    actions.push({
                        type: AutoModerationActionType.Timeout,
                        metadata: { durationSeconds: ruleConfig.timeoutDuration || 300 } // Default 5 minute timeout
                    });
                }

                // Create the rule
                const rule = await interaction.guild!.autoModerationRules.create({
                    name: ruleConfig.name,
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType: ruleConfig.triggerType,
                    triggerMetadata: ruleConfig.triggerMetadata,
                    actions,
                    enabled: true,
                    reason: `Created by ${interaction.user.tag} via bot command (preset: ${preset})`
                });
                
                createdRules.push(rule);
            }

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('✅ AutoMod Preset Installed')
                .setDescription(`Successfully installed the **${this.getPresetName(preset)}** preset with ${createdRules.length} rules.`)
                .addFields(
                    { name: 'Rules Created', value: createdRules.map(rule => `• ${rule.name}`).join('\n'), inline: false }
                )
                .setFooter({ text: `Created by ${interaction.user.tag}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error installing AutoMod preset:', error);
            return interaction.editReply({
                content: 'Failed to install AutoMod preset. Make sure the bot has the necessary permissions.'
            });
        }
    }

    private getPresetName(preset: string): string {
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

    private getPresetRules(preset: string): Array<{
        name: string;
        triggerType: AutoModerationRuleTriggerType;
        triggerMetadata: any;
        timeout: boolean;
        timeoutDuration?: number;
    }> {
        const rules = [];

        // Common rules for all presets
        rules.push({
            name: 'Anti-Spam Protection',
            triggerType: AutoModerationRuleTriggerType.Spam,
            triggerMetadata: {},
            timeout: preset !== 'low'
        });

        // Add preset-specific rules
        switch (preset) {
            case 'low':
                // Basic protection
                rules.push({
                    name: 'Mention Spam Protection',
                    triggerType: AutoModerationRuleTriggerType.MentionSpam,
                    triggerMetadata: { mentionTotalLimit: 10 },
                    timeout: false
                });
                break;

            case 'medium':
                // Standard protection
                rules.push({
                    name: 'Mention Spam Protection',
                    triggerType: AutoModerationRuleTriggerType.MentionSpam,
                    triggerMetadata: { mentionTotalLimit: 6 },
                    timeout: true,
                    timeoutDuration: 600 // 10 minutes
                });
                
                rules.push({
                    name: 'Common Profanity Filter',
                    triggerType: AutoModerationRuleTriggerType.Keyword,
                    triggerMetadata: { 
                        keywordFilter: ['fuck', 'shit', 'bitch', 'dick', 'asshole', 'cunt'] 
                    },
                    timeout: false
                });
                break;

            case 'high':
                // Strict protection
                rules.push({
                    name: 'Strict Mention Spam Protection',
                    triggerType: AutoModerationRuleTriggerType.MentionSpam,
                    triggerMetadata: { mentionTotalLimit: 4 },
                    timeout: true,
                    timeoutDuration: 1800 // 30 minutes
                });
                
                rules.push({
                    name: 'Profanity Filter',
                    triggerType: AutoModerationRuleTriggerType.Keyword,
                    triggerMetadata: { 
                        keywordFilter: ['fuck', 'shit', 'bitch', 'dick', 'asshole', 'cunt', 'whore', 'slut', 'bastard', 'damn'] 
                    },
                    timeout: true,
                    timeoutDuration: 600 // 10 minutes
                });
                
                rules.push({
                    name: 'Link Filter',
                    triggerType: AutoModerationRuleTriggerType.Keyword,
                    triggerMetadata: { keywordFilter: ['http://', 'https://'] },
                    timeout: false
                });
                break;
        }

        return rules;
    }

    // Helper method to get human-readable trigger type name
    private getTriggerTypeName(triggerType: AutoModerationRuleTriggerType): string {
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

    // For autocomplete on rule IDs
    public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
        if (interaction.commandName === 'automod' && interaction.options.getSubcommand() === 'delete') {
            try {
                const rules = await interaction.guild!.autoModerationRules.fetch();
                const choices = rules.map(rule => ({
                    name: `${rule.name} (${rule.id})`,
                    value: rule.id
                }));
                
                return interaction.respond(choices);
            } catch (error) {
                console.error('Error in autocomplete:', error);
                return interaction.respond([]);
            }
        }
    }
}