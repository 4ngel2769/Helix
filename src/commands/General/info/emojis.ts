import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'emojis',
  description: 'List server emojis',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class EmojisCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'List server emojis', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const guild = interaction.guild; if (!guild) return interaction.editReply('This command can only be used in a server.'); const emojis = guild.emojis.cache; if (!emojis.size) return interaction.editReply('No custom emojis in this server.'); return interaction.editReply('Emojis: ' + emojis.map(e => e.toString()).join(' '));
    } catch (error) {
      this.container.logger.error('Error in emojis:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: import('discord.js').Message) {
    try {
      const guild = message.guild; if (!guild) return message.reply('This command can only be used in a server.'); const emojis = guild.emojis.cache; if (!emojis.size) return message.reply('No custom emojis in this server.'); return message.reply('Emojis: ' + emojis.map(e => e.toString()).join(' '));
    } catch (error) {
      this.container.logger.error('Error in emojis:', error);
      return message.reply('An error occurred.');
    }
  }
}
