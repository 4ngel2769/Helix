import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: 'say',
  description: 'Make the bot say something',
  
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class SayCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'Make the bot say something', enabled: true });
  }

  public override async messageRun(message: import('discord.js').Message) {
    const text = message.content.split(/\s+/).slice(1).join(' ');
    if (!text) return message.reply('Provide something to say!');
    await message.delete().catch(() => {});
    return (message.channel as any).send(text);
  }
}
