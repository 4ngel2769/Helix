import { Command } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { Args } from '@sapphire/framework';
import { Guild } from '../../models/Guild';

export class ModuleCommand extends Command {
  constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'module',
      description: 'Sets or gets the module status for the guild',
      preconditions: ['GuildOnly'], // Ensures the command is only used in a guild
    });
  }

  public override async messageRun(message: Message, args: Args) {
    const action = await args.pick('string').catch(() => null);
    const guildId = message.guild!.id;

    if (action === 'set') {
      const status = await args.pick('boolean').catch(() => null);

      if (status === null) {
        return message.reply({ 
          content: 'Please specify true or false.',
          allowedMentions: { repliedUser: false }
        });
      }

      let guildData = await Guild.findOne({ guildId });

      if (!guildData) {
        guildData = new Guild({ guildId, isModule: status });
      } else {
        guildData.isModule = status;
      }

      await guildData.save();

      return message.reply({ 
        content: `Module status set to ${status}.`,
        allowedMentions: { repliedUser: false }
      });
    }

    if (action === 'get') {
      const guildData = await Guild.findOne({ guildId });

      if (!guildData) {
        return message.reply({ 
          content: 'Module status is not set.',
          allowedMentions: { repliedUser: false }
        });
      }

      return message.reply({ 
        content: `Module status is ${guildData.isModule}.`,
        allowedMentions: { repliedUser: false }
      });
    }

    return message.reply({ 
      content: 'Invalid action. Use "set" or "get".',
      allowedMentions: { repliedUser: false }
    });
  }
} 