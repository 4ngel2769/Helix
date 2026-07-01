import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'channelinfo',
  description: 'Show channel information',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class ChannelinfoCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Show channel information', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const channel = interaction.channel as any; if (!channel || !channel.isTextBased()) return interaction.editReply('This is not a text channel.'); const embed = new EmbedBuilder().setColor(config.bot.embedColor.default as ColorResolvable).setTitle('Channel Info').addFields({ name: 'Name', value: '#' + channel.name, inline: true },{ name: 'ID', value: channel.id, inline: true },{ name: 'Type', value: require('discord.js').ChannelType[channel.type] || channel.type.toString(), inline: true },{ name: 'Category', value: channel.parent ? channel.parent.name : 'None', inline: true },{ name: 'Topic', value: ('topic' in channel && channel.topic) || 'No topic', inline: false }); return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Error in channelinfo:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: import('discord.js').Message) {
    try {
      const channel = message.channel as any; if (!channel || !channel.isTextBased()) return message.reply('This is not a text channel.'); const embed = new EmbedBuilder().setColor(config.bot.embedColor.default as ColorResolvable).setTitle('Channel Info').addFields({ name: 'Name', value: '#' + channel.name, inline: true },{ name: 'ID', value: channel.id, inline: true },{ name: 'Type', value: require('discord.js').ChannelType[channel.type] || channel.type.toString(), inline: true },{ name: 'Category', value: channel.parent ? channel.parent.name : 'None', inline: true },{ name: 'Topic', value: ('topic' in channel && channel.topic) || 'No topic', inline: false }); return message.reply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Error in channelinfo:', error);
      return message.reply('An error occurred.');
    }
  }
}
