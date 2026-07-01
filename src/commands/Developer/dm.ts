import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: 'dm',
  description: 'DM a user',
  preconditions: ['OwnerOnly'],
  enabled: true
})
export class DmCommand extends Command {
  public override async messageRun(message: import('discord.js').Message) {
    const args = message.content.split(/\s+/).slice(1);
    const user = await message.client.users.fetch(args[0]).catch(() => null);
    if (!user) return message.reply('User not found.');
    const text = args.slice(1).join(' ');
    if (!text) return message.reply('Provide a message.');
    await user.send(text);
    return message.reply('DM sent to ' + user.tag + '.');
  }
}
