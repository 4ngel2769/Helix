import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { type Message, MessageFlags } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'mycolor',
  description: 'Show your current color role',
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class MycolorCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'Show your current color role', enabled: true });
  }

  public override async messageRun(message: Message) {
    const member = message.member;
    if (!member || !('roles' in member)) return message.reply('Could not find you.');
    const colorRole = member.roles.cache.find(r => r.color !== 0);
    if (!colorRole) return message.reply('You have no custom color role.');
    return message.reply('Your color: ' + colorRole.name + ' - ' + colorRole.hexColor);
  }
}
