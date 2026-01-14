import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Guild } from '../../models/Guild';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import { AdministrationModule } from '../../modules/Administration';

@ApplyOptions<Command.Options>({
    name: 'settings',
    description: 'View comprehensive server settings',
    aliases: ['config', 'conf'],
    preconditions: ['GuildOnly']
})
export class SettingsCommand extends ModuleCommand<AdministrationModule> {
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
            return interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
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
                    .setTitle(`⚙️ Server Settings - ${interaction.guild.name}`)
                    .setDescription('Comprehensive server configuration overview')
                    .addFields(
                        {
                            name: '📝 General',
                            value: `**Prefix:** \`${currentPrefix}\`\n**Disabled Commands:** ${guildData.disabledCommands?.length || 0}`,
                            inline: true
                        },
                        {
                            name: '👥 Roles',
                            value: this.formatRoleSettings(guildData, interaction.guild.id),
                            inline: true
                        },
                        {
                            name: '📊 Logging',
                            value: this.formatLoggingSettings(guildData, interaction.guild.id),
                            inline: true
                        },
                        {
                            name: '🔧 Modules',
                            value: this.formatModuleSettings(guildData),
                            inline: false
                        },
                        {
                            name: '💡 Tip',
                            value: 'Use `/settings <category>` to view detailed settings for a specific category.',
                            inline: false
                        }
                    )
                    .setThumbnail(interaction.guild.iconURL() || undefined)
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
                    return interaction.reply({ content: '❌ Invalid category.', ephemeral: true });
            }

        } catch (error) {
            console.error('Error fetching settings:', error);
            return interaction.reply({ 
                content: '❌ An error occurred while fetching server settings.', 
                ephemeral: true 
            });
        }
    }

    private formatRoleSettings(guildData: any, guildId: string): string {
        const roles = [];
        if (guildData.adminRoleId) roles.push(`Admin: <@&${guildData.adminRoleId}>`);
        if (guildData.modRoleId) roles.push(`Mod: <@&${guildData.modRoleId}>`);
        if (guildData.muteRoleId) roles.push(`Mute: <@&${guildData.muteRoleId}>`);
        return roles.length > 0 ? roles.join('\n') : '*Not configured*';
    }

    private formatLoggingSettings(guildData: any, guildId: string): string {
        const logs = [];
        if (guildData.modLogChannelId) logs.push(`Mod: <#${guildData.modLogChannelId}>`);
        if (guildData.memberLogChannelId) logs.push(`Member: <#${guildData.memberLogChannelId}>`);
        if (guildData.messageEditLogChannelId) logs.push(`Edit: <#${guildData.messageEditLogChannelId}>`);
        if (guildData.messageDeleteLogChannelId) logs.push(`Delete: <#${guildData.messageDeleteLogChannelId}>`);
        return logs.length > 0 ? logs.join('\n') : '*Not configured*';
    }

    private formatModuleSettings(guildData: any): string {
        const modules = guildData.modules || {};
        const enabled = Object.keys(modules).filter(key => modules[key] === true);
        const disabled = Object.keys(modules).filter(key => modules[key] === false);
        
        return `**Enabled:** ${enabled.length}\n**Disabled:** ${disabled.length}`;
    }

    private async showRoleSettings(interaction: Command.ChatInputCommandInteraction, guildData: any) {
        const embed = new EmbedBuilder()
            .setColor('#49e358')
            .setTitle('👥 Role Settings')
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
                    name: '⚙️ Configuration Commands',
                    value: '`/setadminrole` - Set admin role\n`/setmodrole` - Set moderator role\n`/setmuterole` - Set mute role',
                    inline: false
                }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    private async showLoggingSettings(interaction: Command.ChatInputCommandInteraction, guildData: any) {
        const embed = new EmbedBuilder()
            .setColor('#49e358')
            .setTitle('📊 Logging Settings')
            .setDescription('Configured logging channels')
            .addFields(
                {
                    name: 'Mod Log',
                    value: guildData.modLogChannelId ? `<#${guildData.modLogChannelId}>` : '*Not set*',
                    inline: true
                },
                {
                    name: 'Member Log',
                    value: guildData.memberLogChannelId ? `<#${guildData.memberLogChannelId}>` : '*Not set*',
                    inline: true
                },
                {
                    name: '\u200b',
                    value: '\u200b',
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
                    name: '\u200b',
                    value: '\u200b',
                    inline: true
                },
                {
                    name: '⚙️ Configuration Commands',
                    value: '`/setmodlog` - Set mod log channel\n`/setmemberlog` - Set member log channel\n`/setmessagelog` - Set message log channels',
                    inline: false
                }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    private async showModuleSettings(interaction: Command.ChatInputCommandInteraction, guildData: any) {
        const modules = guildData.modules || {};
        const modulesList = Object.entries(modules)
            .map(([key, value]) => `${value ? '✅' : '❌'} **${this.capitalizeFirst(key)}**`)
            .join('\n') || '*No modules configured*';

        const embed = new EmbedBuilder()
            .setColor('#49e358')
            .setTitle('🔧 Module Settings')
            .setDescription('Enabled and disabled modules')
            .addFields(
                {
                    name: 'Modules',
                    value: modulesList,
                    inline: false
                },
                {
                    name: '⚙️ Configuration',
                    value: 'Use `/configmodule` to enable or disable modules',
                    inline: false
                }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    private async showGeneralSettings(interaction: Command.ChatInputCommandInteraction, guildData: any, currentPrefix: string) {
        const disabledCommands = guildData.disabledCommands || [];
        const commandsList = disabledCommands.length > 0 
            ? disabledCommands.map((cmd: string) => `\`${cmd}\``).join(', ')
            : '*No commands disabled*';

        const embed = new EmbedBuilder()
            .setColor('#49e358')
            .setTitle('📝 General Settings')
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
                    name: '⚙️ Configuration Commands',
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
