import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: 'shutdown',
  description: 'Shut down the bot',
  preconditions: ['OwnerOnly'],
  enabled: true
})
export class ShutdownCommand extends Command {
  public override async messageRun(message: import('discord.js').Message) {
    await message.reply('Shutting down...');
    process.exit(0);
  }
}
