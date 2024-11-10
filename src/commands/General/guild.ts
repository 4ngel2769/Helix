import { Command } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { Args } from '@sapphire/framework';
import { Guild } from '../../models/Guild';

export class GuildCommand extends Command {
  constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'guild',
      description: 'Manages guild settings and information',
      preconditions: ['GuildOnly', 'ModeratorOnly'], // Only moderators in a guild can use this
    });
  }

  public override async messageRun(message: Message, args: Args) {
    const action = await args.pick('string').catch(() => null);
    const guildId = message.guild!.id;

    switch (action?.toLowerCase()) {
      case 'info':
        // Get guild information
        const guildData = await Guild.findOne({ guildId });
        if (!guildData) {
          return message.reply({ 
            content: 'No guild settings found.',
            allowedMentions: { repliedUser: false }
          });
        }

        return message.reply({ 
          content: `Guild Settings:\n` +
                  `• ID: ${guildId}\n` +
                  `• Modules: ${Object.entries(guildData.toObject())
                    .filter(([key]) => key.startsWith('is') && key.endsWith('Module'))
                    .map(([key, value]) => `${key.replace('is', '').replace('Module', '')}: ${value}`)
                    .join('\n  ')}`,
          allowedMentions: { repliedUser: false }
        });

      default:
        return message.reply({ 
          content: 'Available actions:\n`info` - Show guild settings and information',
          allowedMentions: { repliedUser: false }
        });
    }
  }
}

module.exports = {
  GuildCommand
};
