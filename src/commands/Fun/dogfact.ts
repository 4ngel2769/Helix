import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: 'dogfact',
  description: 'Get a random dog fact',
  aliases: ['dogfacts'],
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class DogfactCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'Get a random dog fact', enabled: true });
  }

  public override async messageRun(message: import('discord.js').Message) {
    try { const res = await fetch('https://dog-api.kinduff.com/api/facts'); const data: any = await res.json(); return message.reply('🐶 ' + data.facts[0]); }
    catch { return message.reply('Could not fetch dog fact.'); }
  }
}
