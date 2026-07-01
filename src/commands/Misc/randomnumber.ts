import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { type Message } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'randomnumber',
  description: 'Generate a random number',
  aliases: ['random', 'rng'],
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class RandomnumberCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Generate a random number', enabled: true });
  }

  public override async messageRun(message: Message) {
    const args = message.content.split(/\s+/).slice(1);
    const min = parseInt(args[0]) || 1;
    const max = parseInt(args[1]) || 100;
    return message.reply('Random number (' + min + '-' + max + '): ' + (Math.floor(Math.random() * (max - min + 1)) + min));
  }
}
