import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { type Message } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'dance',
  description: 'dances with someone',
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class DanceCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'dances with someone', enabled: true });
  }

  public override async messageRun(message: Message) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('You need to mention someone!');
    return message.reply('Dance! ' + message.author + ' dances with ' + target);
  }
}
