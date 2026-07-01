import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'servericon',
  description: 'Show server icon',
  aliases: ['guildicon'],
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class ServericonCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Show server icon', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const guild = interaction.guild; if (!guild) return interaction.editReply('This command can only be used in a server.'); if (!guild.icon) return interaction.editReply('This server has no icon.'); const embed = new EmbedBuilder().setColor(config.bot.embedColor.default as ColorResolvable).setTitle(guild.name + "'s Icon").setImage(guild.iconURL({ size: 1024, extension: 'png' })); return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Error in servericon:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: import('discord.js').Message) {
    try {
      const guild = message.guild; if (!guild) return message.reply('This command can only be used in a server.'); if (!guild.icon) return message.reply('This server has no icon.'); const embed = new EmbedBuilder().setColor(config.bot.embedColor.default as ColorResolvable).setTitle(guild.name + "'s Icon").setImage(guild.iconURL({ size: 1024, extension: 'png' })); return message.reply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Error in servericon:', error);
      return message.reply('An error occurred.');
    }
  }
}
