import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import { IGuild } from '../../models/Guild';
import { Guild } from '../../models/Guild';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import { AdministrationModule } from '../../modules/Administration';

import { HybridModuleCommand } from '../../lib/structures/HybridCommand';

@ApplyOptions<Command.Options>({
    name: 'settings',
    description: 'View comprehensive server settings',
    aliases: ['conf'],
    preconditions: ['GuildOnly']
})
export class SettingsCommand extends HybridModuleCommand<AdministrationModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Administration'
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option
                        .setName('category')
                        .setDescription('View specific category settings')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Roles', value: 'roles' },
                            { name: 'Logging', value: 'logging' },
                            { name: 'Modules', value: 'modules' },
                            { name: 'General', value: 'general' }
                        )
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .setDMPermission(false)
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guild) {
            return interaction.reply({ content: 'âŒ This command can only be used in a server.', flags: MessageFlags.Ephemeral });
        }

        const category = interaction.options.getString('category');

        try {
            let guildData = await Guild.findOne({ guildId: interaction.guild.id });
            
            if (!guildData) {
                guildData = new Guild({
                    guildId: interaction.guild.id
                });
                await guildData.save();
            }

            const defaultPrefix = this.container.client.options.defaultPrefix || '!';
            const currentPrefix = guildData.prefix || defaultPrefix;

            if (!category) {
                // Show all settings overview
                const embed = new EmbedBuilder()
                    .setColor('#49e358')
                    .setTitle(`âš™ï¸ Server Settings - ${interaction.guild.name}`)
                    .setDescription('Comprehensive server configuration overview')
                    .addFields(
                        {
                            name: 'ðŸ“ General',
                            value: `**Prefix:** \`${currentPrefix}\`\n**Disabled Commands:** ${guildData.disabledCommands?.length || 0}`,
                            inline: true
                        },
                        {
                            name: 'ðŸ‘¥ Roles',
                            value: this.formatRoleSettings(guildData, interaction.guild.id),
                            inline: true
                        },
                        {
                            name: 'ðŸ“Š Logging',
                            value: this.formatLoggingSettings(guildData, interaction.guild.id),
                            inline: true
                        },
                        {
                            name: 'ðŸ”§ Modules',
                            value: this.formatModuleSettings(guildData),
                            inline: false
                        },
                        {
                            name: 'ðŸ’¡ Tip',
                            value: 'Use `/settings <category>` to view detailed settings for a specific category.',
                            inline: false
                        }
                    )
                    .setThumbnail(interaction.guild.iconURL() || null)
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            // Show specific category
            // Convert prefix to string for display
            const prefixString = Array.isArray(currentPrefix) 
                ? currentPrefix[0] || '!' 
                : currentPrefix || '!';
            
            switch (category) {
                case 'roles':
                    return this.showRoleSettings(interaction, guildData);
                case 'logging':
                    return this.showLoggingSettings(interaction, guildData);
                case 'modules':
                    return this.showModuleSettings(interaction, guildData);
                case 'general':
                    return this.showGeneralSettings(interaction, guildData, prefixString);
                default:
                    return interaction.reply({ content: 'âŒ Invalid category.', flags: MessageFlags.Ephemeral });
            }

        } catch (error) {
            this.container.logger.error('Error fetching settings:', error);
            return interaction.reply({ 
                content: 'âŒ An error occurred while fetching server settings.', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }

    private formatRoleSettings(guildData: IGuild, guildId: string): string {
        const roles = [];
        if (guildData.adminRoleId) roles.push(`Admin: <@&${guildData.adminRoleId}>`);
        if (guildData.modRoleId) roles.push(`Mod: <@&${guildData.modRoleId}>`);
        if (guildData.muteRoleId) roles.push(`Mute: <@&${guildData.muteRoleId}>`);
        return roles.length > 0 ? roles.join('\n') : '*Not configured*';
    }

    private formatLoggingSettings(guildData: IGuild, guildId: string): string {
        const logs = [];
        if (guildData.logChannelId) logs.push(`Default: <#${guildData.logChannelId}>`);
        if (guildData.modLogChannelId) logs.push(`Mod: <#${guildData.modLogChannelId}>`);
        if (guildData.memberLogChannelId) logs.push(`Member: <#${guildData.memberLogChannelId}>`);
        if (guildData.messageEditLogChannelId) logs.push(`Edit: <#${guildData.messageEditLogChannelId}>`);
        if (guildData.messageDeleteLogChannelId) logs.push(`Delete: <#${guildData.messageDeleteLogChannelId}>`);
        const overrides = Object.keys(guildData.logEvents ?? {}).length;
        if (overrides > 0) logs.push(`${overrides} event toggles`);
        return logs.length > 0 ? logs.join('\n') : '*Not configured*';
    }

    private formatModuleSettings(guildData: IGuild): string {
        const modules = guildData.modules || {};
        const enabled = Object.keys(modules).filter(key => modules[key] === true);
        const disabled = Object.keys(modules).filter(key => modules[key] === false);
        
        return `**Enabled:** ${enabled.length}\n**Disabled:** ${disabled.length}`;
    }

    private async showRoleSettings(interaction: Command.ChatInputCommandInteraction, guildData: IGuild) {
        const embed = new EmbedBuilder()
            .setColor('#49e358')
            .setTitle('ðŸ‘¥ Role Settings')
            .setDescription('Configured roles for server management')
            .addFields(
                {
                    name: 'Admin Role',
                    value: guildData.adminRoleId ? `<@&${guildData.adminRoleId}>` : '*Not set*',
                    inline: true
                },
                {
                    name: 'Moderator Role',
                    value: guildData.modRoleId ? `<@&${guildData.modRoleId}>` : '*Not set*',
                    inline: true
                },
                {
                    name: 'Mute Role',
                    value: guildData.muteRoleId ? `<@&${guildData.muteRoleId}>` : '*Not set*',
                    inline: true
                },
                {
                    name: 'âš™ï¸ Configuration Commands',
                    value: '`/setadminrole` - Set admin role\n`/setmodrole` - Set moderator role\n`/setmuterole` - Set mute role',
                    inline: false
                }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    private async showLoggingSettings(interaction: Command.ChatInputCommandInteraction, guildData: IGuild) {
        const enabledCount = Object.values(guildData.logEvents ?? {}).filter((v) => v === true).length;
        const embed = new EmbedBuilder()
            .setColor('#49e358')
            .setTitle('ðŸ“Š Logging Settings')
            .setDescription('Configured logging channels (31 event types, see dashboard for per-event setup)')
            .addFields(
                {
                    name: 'Default Channel',
                    value: guildData.logChannelId ? `<#${guildData.logChannelId}>` : '*Not set*',
                    inline: true
                },
                {
                    name: 'Event Toggles',
                    value: `${enabledCount} explicitly enabled`,
                    inline: true
                },
                {
                    name: 'Member Log',
                    value: guildData.memberLogChannelId ? `<#${guildData.memberLogChannelId}>` : '*Not set*',
                    inline: true
                },
                {
                    name: 'Mod Log',
                    value: guildData.modLogChannelId ? `<#${guildData.modLogChannelId}>` : '*Not set*',
                    inline: true
                },
                {
                    name: 'Message Edit Log',
                    value: guildData.messageEditLogChannelId ? `<#${guildData.messageEditLogChannelId}>` : '*Not set*',
                    inline: true
                },
                {
                    name: 'Message Delete Log',
                    value: guildData.messageDeleteLogChannelId ? `<#${guildData.messageDeleteLogChannelId}>` : '*Not set*',
                    inline: true
                },
                {
                    name: 'âš™ï¸ Configuration',
                    value: '`/setmodlog` `/setmemberlog` `/setmessagelog` â€” or open the dashboard Logging page for all 31 event types.',
                    inline: false
                }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    private async showModuleSettings(interaction: Command.ChatInputCommandInteraction, guildData: IGuild) {
        const modules = guildData.modules || {};
        const modulesList = Object.entries(modules)
            .map(([key, value]) => `${value ? 'âœ…' : 'âŒ'} **${this.capitalizeFirst(key)}**`)
            .join('\n') || '*No modules configured*';

        const embed = new EmbedBuilder()
            .setColor('#49e358')
            .setTitle('ðŸ”§ Module Settings')
            .setDescription('Enabled and disabled modules')
            .addFields(
                {
                    name: 'Modules',
                    value: modulesList,
                    inline: false
                },
                {
                    name: 'âš™ï¸ Configuration',
                    value: 'Use `/configmodule` to enable or disable modules',
                    inline: false
                }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    private async showGeneralSettings(interaction: Command.ChatInputCommandInteraction, guildData: IGuild, currentPrefix: string) {
        const disabledCommands = guildData.disabledCommands || [];
        const commandsList = disabledCommands.length > 0 
            ? disabledCommands.map((cmd: string) => `\`${cmd}\``).join(', ')
            : '*No commands disabled*';

        const embed = new EmbedBuilder()
            .setColor('#49e358')
            .setTitle('ðŸ“ General Settings')
            .setDescription('General server configuration')
            .addFields(
                {
                    name: 'Command Prefix',
                    value: `\`${currentPrefix}\``,
                    inline: true
                },
                {
                    name: 'Disabled Commands',
                    value: `${disabledCommands.length} commands`,
                    inline: true
                },
                {
                    name: '\u200b',
                    value: '\u200b',
                    inline: true
                },
                {
                    name: 'Disabled Command List',
                    value: commandsList,
                    inline: false
                },
                {
                    name: 'âš™ï¸ Configuration Commands',
                    value: '`/setprefix` - Change command prefix\n`/togglecommand` - Enable/disable commands',
                    inline: false
                }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
