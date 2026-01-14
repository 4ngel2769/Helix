import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Message } from 'discord.js';
import { Args } from '@sapphire/framework';
import { Guild, type IGuild } from '../../models/Guild';
import { 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ColorResolvable,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} from 'discord.js';
import config from '../../config';

@ApplyOptions<Command.Options>({
  name: 'guild',
  description: 'Manages guild settings and information',
  preconditions: ['GuildOnly', 'ModeratorOnly']
})
export class GuildCommand extends Command {
  constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'guild',
      description: 'Manages guild settings and information',
      preconditions: ['GuildOnly', 'ModeratorOnly'], // Only moderators in a guild can use this
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('guild')
        .setDescription('Manages guild settings and information')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Info', value: 'info' }
            )
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const action = interaction.options.getString('action', true);
    const guildId = interaction.guildId!;
    const guild = interaction.guild!;

    switch (action.toLowerCase()) {
      case 'info':
        // Get guild information
        const guildData = await Guild.findOne({ guildId });
        if (!guildData) {
          return interaction.reply({ 
            content: 'No guild settings found.',
            flags: MessageFlags.Ephemeral
          });
        }

        // Create embed for guild information
        const embed = new EmbedBuilder()
          .setColor(config.bot.embedColor.default as ColorResolvable)
          .setTitle(`${guild.name} - Server Information`)
          .setThumbnail(guild.iconURL() || 'https://cdn.discordapp.com/embed/avatars/0.png')
          .addFields(
            { 
              name: '📋 General Information', 
              value: `**ID:** \`${guildId}\`\n**Owner:** <@${guild.ownerId}>\n**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
              inline: false
            },
            {
              name: '⚙️ Module Status',
              value: this.formatModuleStatus(guildData),
              inline: false
            }
          )
          .setFooter({ text: `Requested by ${interaction.user.tag}` })
          .setTimestamp();

        // Add additional fields if they exist
        if (guildData.adminRoleId) {
          embed.addFields({ 
            name: '👑 Admin Role', 
            value: `<@&${guildData.adminRoleId}>`,
            inline: true 
          });
        }

        if (guildData.modRoleId) {
          embed.addFields({ 
            name: '🛡️ Moderator Role', 
            value: `<@&${guildData.modRoleId}>`,
            inline: true 
          });
        }

        // Add verification info if module is enabled
        if (guildData.isVerificationModule) {
          const verificationInfo = [];
          if (guildData.verificationChannelId) verificationInfo.push(`**Channel:** <#${guildData.verificationChannelId}>`);
          if (guildData.verificationRoleId) verificationInfo.push(`**Role:** <@&${guildData.verificationRoleId}>`);
          
          if (verificationInfo.length > 0) {
            embed.addFields({
              name: '✅ Verification Setup',
              value: verificationInfo.join('\n'),
              inline: false
            });
          }
        }

        // Add server stats
        embed.addFields({
          name: '📊 Server Stats',
          value: `**Members:** ${guild.memberCount}\n**Channels:** ${guild.channels.cache.size}\n**Roles:** ${guild.roles.cache.size}`,
          inline: false
        });

        // Create button for server icon
        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setLabel('Server Icon')
              .setURL(guild.iconURL({ size: 4096 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
              .setStyle(ButtonStyle.Link)
          );

        return interaction.reply({ 
          embeds: [embed],
          components: [row],
          flags: MessageFlags.Ephemeral
        });

      default:
        return interaction.reply({ 
          content: 'Available actions:\n`info` - Show guild settings and information',
          flags: MessageFlags.Ephemeral
        });
    }
  }

  public override async messageRun(message: Message, args: Args) {
    const action = await args.pick('string').catch(() => null);
    const guildId = message.guild!.id;
    const guild = message.guild!;

    switch (action?.toLowerCase()) {
      case 'info':
        // Get guild information
        const guildData = await Guild.findOne({ guildId });
        if (!guildData) {
          return message.reply({ 
            content: 'No guild settings found.',
            allowedMentions: { repliedUser: false }
          });
        }

        // Create embed for guild information
        const embed = new EmbedBuilder()
          .setColor(config.bot.embedColor.default as ColorResolvable)
          .setTitle(`${guild.name} - Server Information`)
          .setThumbnail(guild.iconURL() || 'https://cdn.discordapp.com/embed/avatars/0.png')
          .addFields(
            { 
              name: '📋 General Information', 
              value: `**ID:** \`${guildId}\`\n**Owner:** <@${guild.ownerId}>\n**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
              inline: false
            },
            {
              name: '⚙️ Module Status',
              value: `> ${this.formatModuleStatus(guildData)}`,
              inline: false
            }
          )
          .setFooter({ text: `Requested by ${message.author.tag}` })
          .setTimestamp();

        // Add additional fields if they exist
        if (guildData.adminRoleId) {
          embed.addFields({ 
            name: '👑 Admin Role', 
            value: `> <@&${guildData.adminRoleId}>`,
            inline: true 
          });
        }

        if (guildData.modRoleId) {
          embed.addFields({ 
            name: '🛡️ Moderator Role', 
            value: `> <@&${guildData.modRoleId}>`,
            inline: true 
          });
        }

        // Add verification info if module is enabled
        if (guildData.isVerificationModule) {
          const verificationInfo = [];
          if (guildData.verificationChannelId) verificationInfo.push(`> **Channel:** <#${guildData.verificationChannelId}>`);
          if (guildData.verificationRoleId) verificationInfo.push(`> **Role:** <@&${guildData.verificationRoleId}>`);
          
          if (verificationInfo.length > 0) {
            embed.addFields({
              name: '✅ Verification Setup',
              value: `> ${verificationInfo.join('\n')}`,
              inline: false
            });
          }
        }

        // Add server stats
        embed.addFields({
          name: '📊 Server Stats',
          value: `> **Members:** ${guild.memberCount}\n> **Channels:** ${guild.channels.cache.size}\n> **Roles:** ${guild.roles.cache.size}`,
          inline: false
        });

        // Create button for server icon
        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setLabel('Server Icon')
              .setURL(guild.iconURL({ size: 4096 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
              .setStyle(ButtonStyle.Link)
          );

        return message.reply({ 
          embeds: [embed],
          components: [row],
          allowedMentions: { repliedUser: false }
        });

      default:
        return message.reply({ 
          content: 'Available actions:\n`info` - Show guild settings and information',
          allowedMentions: { repliedUser: false }
        });
    }
  }

  // Helper method to format module status
  private formatModuleStatus(guildData: IGuild): string {
    const moduleEntries = Object.entries(guildData.toObject())
      .filter(([key]) => key.startsWith('is') && key.endsWith('Module'));
    
    if (moduleEntries.length === 0) return 'No modules configured';
    
    return moduleEntries
      .map(([key, value]) => {
        const moduleName = key.replace('is', '').replace('Module', '');
        const status = value ? '✅ Enabled' : '❌ Disabled';
        return `**${moduleName}:** ${status}`;
      })
      .join('\n');
  }
}

module.exports = {
  GuildCommand
};
