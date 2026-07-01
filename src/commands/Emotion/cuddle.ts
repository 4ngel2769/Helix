import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { type Message } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'cuddle',
  description: 'cuddles someone',
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class CuddleCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'cuddles someone', enabled: true });
  }

  public override async messageRun(message: Message) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('You need to mention someone!');
    return message.reply('Cuddle! ' + message.author + ' cuddles ' + target);
  }
}
