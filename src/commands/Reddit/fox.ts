import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable, type Message } from 'discord.js';
import config from '../../config';

@ApplyOptions<Command.Options>({
  name: 'fox',
  description: 'Get a random fox image',
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class FoxCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'Get a random fox image', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const res = await fetch('https://some-random-api.com/animal/fox');
      const data: any = await res.json();
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor.default as ColorResolvable)
        .setTitle('Random Fox')
        .setImage(data.image)
        .setFooter({ text: data.fact || '' });
      return interaction.editReply({ embeds: [embed] });
    } catch {
      return interaction.editReply({ content: 'Failed to fetch fox image.' });
    }
  }

  public override async messageRun(message: Message) {
    try {
      const res = await fetch('https://some-random-api.com/animal/fox');
      const data: any = await res.json();
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor.default as ColorResolvable)
        .setTitle('Random Fox')
        .setImage(data.image)
        .setFooter({ text: data.fact || '' });
      return message.reply({ embeds: [embed] });
    } catch {
      return message.reply('Failed to fetch fox image.');
    }
  }
}
