import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import type { Message } from 'discord.js';

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
      return interaction.editReply(`Uptime: ${this.formatUptime(process.uptime())}`);
    } catch (error) {
      this.container.logger.error('Error in uptime:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: Message) {
    try {
      return message.reply(`Uptime: ${this.formatUptime(process.uptime())}`);
    } catch (error) {
      this.container.logger.error('Error in uptime:', error);
      return message.reply('An error occurred.');
    }
  }

  private formatUptime(secondsInput: number): string {
    const seconds = Math.floor(secondsInput);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
  }
}
