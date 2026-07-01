import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'avatar',
  description: 'Show a user\'s avatar',
  aliases: ['pfp'],
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class AvatarCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Show a user\'s avatar', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const user = interaction.options.getUser('user') || interaction.user; const embed = new EmbedBuilder().setColor(config.bot.embedColor.default as ColorResolvable).setTitle(user.tag + "'s Avatar").setImage(user.displayAvatarURL({ size: 1024, extension: 'png' })); return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Error in avatar:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: import('discord.js').Message) {
    try {
      const user = message.mentions.users.first() || message.author; const embed = new EmbedBuilder().setColor(config.bot.embedColor.default as ColorResolvable).setTitle(user.tag + "'s Avatar").setImage(user.displayAvatarURL({ size: 1024, extension: 'png' })); return message.reply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Error in avatar:', error);
      return message.reply('An error occurred.');
    }
  }
}
