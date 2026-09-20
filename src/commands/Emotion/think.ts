import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { type Message } from 'discord.js';
import { findEmote, replyWithEmote } from '../../lib/emotes/emotes';

@ApplyOptions<Command.Options>({
  name: 'think',
  description: 'thinks about someone',
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class ThinkCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'thinks about someone', enabled: true });
  }

  public override async messageRun(message: Message) {
    const definition = findEmote('think')!;
    return replyWithEmote(definition, message);
  }
}
