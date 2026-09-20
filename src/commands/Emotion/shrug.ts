import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { type Message } from 'discord.js';
import { findEmote, replyWithEmote } from '../../lib/emotes/emotes';

@ApplyOptions<Command.Options>({
  name: 'shrug',
  description: 'shrugs at someone',
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class ShrugCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'shrugs at someone', enabled: true });
  }

  public override async messageRun(message: Message) {
    const definition = findEmote('shrug')!;
    return replyWithEmote(definition, message);
  }
}
