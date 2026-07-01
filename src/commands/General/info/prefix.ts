import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'prefix',
  description: 'Show current command prefix',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class PrefixCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Show current command prefix', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const guild = interaction.guild; const GuildModel = require('../../models/Guild').Guild; const g = guild ? await GuildModel.findOne({ guildId: guild.id }) : null; const prefix = g?.prefix || 'x'; return interaction.editReply('Current prefix: `' + prefix + '`');
    } catch (error) {
      this.container.logger.error('Error in prefix:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: import('discord.js').Message) {
    try {
      const guild = message.guild; const GuildModel = require('../../models/Guild').Guild; const g = guild ? await GuildModel.findOne({ guildId: guild.id }) : null; const prefix = g?.prefix || 'x'; return message.reply('Current prefix: `' + prefix + '`');
    } catch (error) {
      this.container.logger.error('Error in prefix:', error);
      return message.reply('An error occurred.');
    }
  }
}
