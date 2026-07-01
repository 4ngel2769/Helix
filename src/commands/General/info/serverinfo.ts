import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'serverinfo',
  description: 'Show server information',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class ServerinfoCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Show server information', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const guild = interaction.guild; if (!guild) return interaction.editReply('This command can only be used in a server.'); const embed = new EmbedBuilder().setColor(config.bot.embedColor.default as ColorResolvable).setTitle(guild.name).setThumbnail(guild.iconURL({ size: 1024 })).addFields({ name: 'Owner', value: (await guild.fetchOwner()).user.tag, inline: true },{ name: 'Members', value: guild.memberCount.toString(), inline: true },{ name: 'Channels', value: guild.channels.cache.size.toString(), inline: true },{ name: 'Roles', value: guild.roles.cache.size.toString(), inline: true },{ name: 'Created', value: '<t:' + Math.floor(guild.createdTimestamp / 1000) + ':R>', inline: true },{ name: 'ID', value: guild.id, inline: true }).setFooter({ text: 'Requested by ' + interaction.user.tag }); return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Error in serverinfo:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: import('discord.js').Message) {
    try {
      const guild = message.guild; if (!guild) return message.reply('This command can only be used in a server.'); const embed = new EmbedBuilder().setColor(config.bot.embedColor.default as ColorResolvable).setTitle(guild.name).setThumbnail(guild.iconURL({ size: 1024 })).addFields({ name: 'Owner', value: (await guild.fetchOwner()).user.tag, inline: true },{ name: 'Members', value: guild.memberCount.toString(), inline: true },{ name: 'Channels', value: guild.channels.cache.size.toString(), inline: true },{ name: 'Roles', value: guild.roles.cache.size.toString(), inline: true },{ name: 'Created', value: '<t:' + Math.floor(guild.createdTimestamp / 1000) + ':R>', inline: true },{ name: 'ID', value: guild.id, inline: true }).setFooter({ text: 'Requested by ' + message.author.tag }); return message.reply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Error in serverinfo:', error);
      return message.reply('An error occurred.');
    }
  }
}
