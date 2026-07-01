import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable, type Message } from 'discord.js';
import config from '../../config';

@ApplyOptions<Command.Options>({
  name: 'bunny',
  description: 'Get a random bunny image',
  aliases: ['bunnies'],
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class BunnyCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'Get a random bunny image', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const res = await fetch('https://api.thedogapi.com/v1/images/search?limit=1');
      const data: any = await res.json();
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor.default as ColorResolvable)
        .setTitle('Random Bunny')
        .setImage(data[0]?.url);
      return interaction.editReply({ embeds: [embed] });
    } catch {
      return interaction.editReply({ content: 'Failed to fetch bunny image.' });
    }
  }

  public override async messageRun(message: Message) {
    try {
      const res = await fetch('https://api.thedogapi.com/v1/images/search?limit=1');
      const data: any = await res.json();
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor.default as ColorResolvable)
        .setTitle('Random Bunny')
        .setImage(data[0]?.url);
      return message.reply({ embeds: [embed] });
    } catch {
      return message.reply('Failed to fetch bunny image.');
    }
  }
}
