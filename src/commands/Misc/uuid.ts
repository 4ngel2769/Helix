import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { type Message } from 'discord.js';
import { randomUUID } from 'node:crypto';

@ApplyOptions<Command.Options>({
  name: 'uuid',
  description: 'Generate a UUID',
  aliases: ['generateuuid'],
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class UuidCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Generate a UUID', enabled: true });
  }

  public override async messageRun(message: Message) {
    return message.reply(randomUUID());
  }
}
