import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: 'roll',
  description: 'Roll a dice',
  aliases: ['dice'],
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class RollCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'Roll a dice', enabled: true });
  }

  public override async messageRun(message: import('discord.js').Message) {
    return message.reply('🎲 You rolled a ' + (Math.floor(Math.random() * 6) + 1));
  }
}
