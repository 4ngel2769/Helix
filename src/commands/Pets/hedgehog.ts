import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable, type Message } from 'discord.js';
import config from '../../config';

@ApplyOptions<Command.Options>({
  name: 'hedgehog',
  description: 'Get a random hedgehog image',
  
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class HedgehogCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'Get a random hedgehog image', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const res = await fetch('https://api.thedogapi.com/v1/images/search?limit=1');
      const data: any = await res.json();
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor.default as ColorResolvable)
        .setTitle('Random Hedgehog')
        .setImage(data[0]?.url);
      return interaction.editReply({ embeds: [embed] });
    } catch {
      return interaction.editReply({ content: 'Failed to fetch hedgehog image.' });
    }
  }

  public override async messageRun(message: Message) {
    try {
      const res = await fetch('https://api.thedogapi.com/v1/images/search?limit=1');
      const data: any = await res.json();
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor.default as ColorResolvable)
        .setTitle('Random Hedgehog')
        .setImage(data[0]?.url);
      return message.reply({ embeds: [embed] });
    } catch {
      return message.reply('Failed to fetch hedgehog image.');
    }
  }
}
