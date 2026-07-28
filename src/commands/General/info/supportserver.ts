import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable, type Message } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'supportserver',
  description: 'Get support server invite',
  aliases: ['support'],
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class SupportserverCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Get support server invite', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      return interaction.editReply({ embeds: [this.buildSupportEmbed()] });
    } catch (error) {
      this.container.logger.error('Error in supportserver:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: Message) {
    try {
      return message.reply({ embeds: [this.buildSupportEmbed()] });
    } catch (error) {
      this.container.logger.error('Error in supportserver:', error);
      return message.reply('An error occurred.');
    }
  }

  private buildSupportEmbed() {
    return new EmbedBuilder()
      .setColor(config.bot.embedColor.default as ColorResolvable)
      .setTitle('Support Server')
      .setDescription('Need help? Join our support server!')
      .setURL('https://discord.gg/helix');
  }
}
