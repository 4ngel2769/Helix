import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'yeet',
  description: 'Show a fun user profile display',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class YeetCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Show a fun user profile display', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const user = interaction.options.getUser('user') || interaction.user; const member = interaction.guild?.members.cache.get(user.id); const embed = new EmbedBuilder().setColor(config.bot.embedColor.magic as ColorResolvable).setTitle('YEET!').setDescription(user.tag + ' has been yeeted!').setThumbnail(user.displayAvatarURL()).addFields({ name: 'Joined', value: member ? '<t:' + Math.floor(member.joinedTimestamp! / 1000) + ':R>' : 'Unknown', inline: true },{ name: 'Roles', value: member ? member.roles.cache.size.toString() : '0', inline: true }); return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Error in yeet:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: import('discord.js').Message) {
    try {
      const user = message.mentions.users.first() || message.author; const member = message.guild?.members.cache.get(user.id); const embed = new EmbedBuilder().setColor(config.bot.embedColor.magic as ColorResolvable).setTitle('YEET!').setDescription(user.tag + ' has been yeeted!').setThumbnail(user.displayAvatarURL()).addFields({ name: 'Joined', value: member ? '<t:' + Math.floor(member.joinedTimestamp! / 1000) + ':R>' : 'Unknown', inline: true },{ name: 'Roles', value: member ? member.roles.cache.size.toString() : '0', inline: true }); return message.reply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Error in yeet:', error);
      return message.reply('An error occurred.');
    }
  }
}
