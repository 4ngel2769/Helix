import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { type Message } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'password',
  description: 'Generate a random password',
  aliases: ['genpassword', 'passgen'],
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class PasswordCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Generate a random password', enabled: true });
  }

  public override async messageRun(message: Message) {
    const length = parseInt(message.content.split(/\s+/).slice(1)[0]) || 16;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let pwd = '';
    for (let i = 0; i < length; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    return message.reply('Password: ||' + pwd + '||');
  }
}
