import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: 'leaveserver',
  description: 'Leave a server by ID',
  preconditions: ['OwnerOnly'],
  enabled: true
})
export class LeaveserverCommand extends Command {
  public override async messageRun(message: import('discord.js').Message) {
    const id = message.content.split(/\s+/).slice(1)[0];
    if (!id) return message.reply('Provide a guild ID.');
    const guild = message.client.guilds.cache.get(id);
    if (!guild) return message.reply('Guild not found.');
    await guild.leave();
    return message.reply('Left ' + guild.name + '.');
  }
}
