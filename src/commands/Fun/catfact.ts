import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: 'catfact',
  description: 'Get a random cat fact',
  aliases: ['catfacts'],
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class CatfactCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'Get a random cat fact', enabled: true });
  }

  public override async messageRun(message: import('discord.js').Message) {
    try { const res = await fetch('https://catfact.ninja/fact'); const data: any = await res.json(); return message.reply('🐱 ' + data.fact); }
    catch { return message.reply('Could not fetch cat fact.'); }
  }
}
