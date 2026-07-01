import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: 'emojify',
  description: 'Convert text to regional indicator emojis',
  
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class EmojifyCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'Convert text to regional indicator emojis', enabled: true });
  }

  public override async messageRun(message: import('discord.js').Message) {
    const text = message.content.split(/\s+/).slice(1).join(' ').toLowerCase();
    if (!text) return message.reply('Provide text to emojify!');
    const result = text.split('').map(c => {
      if (c.match(/[a-z]/)) return ':regional_indicator_' + c + ':';
      if (c === ' ') return '  ';
      return c;
    }).join(' ');
    return message.reply(result);
  }
}
