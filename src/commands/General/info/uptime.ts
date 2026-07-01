import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'uptime',
  description: 'Show bot uptime',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class UptimeCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Show bot uptime', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const seconds = Math.floor(process.uptime()); const d = Math.floor(seconds / 86400); const h = Math.floor((seconds % 86400) / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60; return interaction.editReply('Uptime: ' + d + 'd ' + h + 'h ' + m + 'm ' + s + 's');
    } catch (error) {
      this.container.logger.error('Error in uptime:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: import('discord.js').Message) {
    try {
      const seconds = Math.floor(process.uptime()); const d = Math.floor(seconds / 86400); const h = Math.floor((seconds % 86400) / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60; return message.reply('Uptime: ' + d + 'd ' + h + 'h ' + m + 'm ' + s + 's');
    } catch (error) {
      this.container.logger.error('Error in uptime:', error);
      return message.reply('An error occurred.');
    }
  }
}
