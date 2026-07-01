import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: 'guildlist',
  description: 'List all guilds the bot is in',
  aliases: ['servers'],
  preconditions: ['OwnerOnly'],
  enabled: true
})
export class GuildlistCommand extends Command {
  public override async messageRun(message: import('discord.js').Message) {
    const guilds = message.client.guilds.cache.map(g => g.name + ' (' + g.id + ' - ' + g.memberCount + ' members)');
    return message.reply('```\n' + guilds.join('\n').slice(0, 1900) + '\n```');
  }
}
