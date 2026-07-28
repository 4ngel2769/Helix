import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ChannelType, EmbedBuilder, type ColorResolvable, type Message } from 'discord.js';
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
      const channel = interaction.channel;
      if (!channel || !channel.isTextBased()) return interaction.editReply('This is not a text channel.');

      return interaction.editReply({ embeds: [this.buildChannelEmbed(channel)] });
    } catch (error) {
      this.container.logger.error('Error in channelinfo:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: Message) {
    try {
      const channel = message.channel;
      if (!channel.isTextBased()) return message.reply('This is not a text channel.');

      return message.reply({ embeds: [this.buildChannelEmbed(channel)] });
    } catch (error) {
      this.container.logger.error('Error in channelinfo:', error);
      return message.reply('An error occurred.');
    }
  }

  private buildChannelEmbed(channel: Message['channel']) {
    const channelName = 'name' in channel && typeof channel.name === 'string' ? `#${channel.name}` : 'Direct Message';
    const channelType = ChannelType[channel.type] || channel.type.toString();
    const channelCategory = 'parent' in channel && channel.parent ? channel.parent.name : 'None';
    const channelTopic = 'topic' in channel && typeof channel.topic === 'string' && channel.topic.length > 0 ? channel.topic : 'No topic';

    return new EmbedBuilder()
      .setColor(config.bot.embedColor.default as ColorResolvable)
      .setTitle('Channel Info')
      .addFields(
        { name: 'Name', value: channelName, inline: true },
        { name: 'ID', value: channel.id, inline: true },
        { name: 'Type', value: channelType, inline: true },
        { name: 'Category', value: channelCategory, inline: true },
        { name: 'Topic', value: channelTopic, inline: false }
      );
  }
}
