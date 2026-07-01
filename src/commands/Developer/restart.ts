import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: 'restart',
  description: 'Restart the bot',
  preconditions: ['OwnerOnly'],
  enabled: true
})
export class RestartCommand extends Command {
  public override async messageRun(message: import('discord.js').Message) {
    await message.reply('Restarting...');
    process.exit(0);
  }
}
