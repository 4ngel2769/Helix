import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: 'coinflip',
  description: 'Flip a coin',
  aliases: ['cf'],
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class CoinflipCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'Flip a coin', enabled: true });
  }

  public override async messageRun(message: import('discord.js').Message) {
    return message.reply('🪙 ' + (Math.random() < 0.5 ? 'Heads' : 'Tails'));
  }
}
