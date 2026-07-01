import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: 'yesno',
  description: 'Random yes/no/maybe',
  
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class YesnoCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'Random yes/no/maybe', enabled: true });
  }

  public override async messageRun(message: import('discord.js').Message) {
    const responses = ['Yes', 'No', 'Maybe', 'Definitely', 'Absolutely not', 'Ask again later'];
    return message.reply('🤔 ' + responses[Math.floor(Math.random() * responses.length)]);
  }
}
