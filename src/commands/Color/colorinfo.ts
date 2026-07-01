import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable, type Message } from 'discord.js';
import config from '../../config';

@ApplyOptions<Command.Options>({
  name: 'colorinfo',
  description: 'Get detailed info about a hex color',
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class ColorinfoCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'Get detailed info about a hex color', enabled: true });
  }

  public override async messageRun(message: Message) {
    const hex = message.content.split(/\s+/).slice(1)[0];
    if (!hex) return message.reply('Provide a hex color (e.g. #ff0000)');
    try {
      const res = await fetch('https://www.thecolorapi.com/id?hex=' + hex.replace('#', ''));
      const data: any = await res.json();
      const embed = new EmbedBuilder()
        .setColor(parseInt(hex.replace('#', ''), 16))
        .setTitle(data.name?.value || 'Color Info')
        .addFields(
          { name: 'HEX', value: data.hex?.value || hex, inline: true },
          { name: 'RGB', value: data.rgb?.value || 'N/A', inline: true },
          { name: 'HSL', value: data.hsl?.value || 'N/A', inline: true }
        );
      return message.reply({ embeds: [embed] });
    } catch {
      return message.reply('Failed to fetch color info.');
    }
  }
}
