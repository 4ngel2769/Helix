import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable, type Message } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'colorpicker',
  description: 'Pick a color and show it',
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class ColorpickerCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Pick a color and show it', enabled: true });
  }

  public override async messageRun(message: Message) {
    const hex = message.content.split(/\s+/).slice(1)[0];
    if (!hex) return message.reply('Provide a hex color (e.g. #ff0000)');
    const color = parseInt(hex.replace('#', ''), 16);
    if (isNaN(color)) return message.reply('Invalid color.');
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Color: ' + hex);
    return message.reply({ embeds: [embed] });
  }
}
