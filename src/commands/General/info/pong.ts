import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'pong',
  description: 'Check bot latency',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class PongCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Check bot latency', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const msg = await interaction.editReply('Pinging...'); const latency = msg.createdTimestamp - interaction.createdTimestamp; const apiLatency = Math.round(interaction.client.ws.ping); return interaction.editReply('Pong! Latency: ' + latency + 'ms | API: ' + apiLatency + 'ms');
    } catch (error) {
      this.container.logger.error('Error in pong:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: import('discord.js').Message) {
    try {
      const msg = await message.reply('Pinging...'); const latency = msg.createdTimestamp - message.createdTimestamp; const apiLatency = Math.round(message.client.ws.ping); return msg.edit('Pong! Latency: ' + latency + 'ms | API: ' + apiLatency + 'ms');
    } catch (error) {
      this.container.logger.error('Error in pong:', error);
      return message.reply('An error occurred.');
    }
  }
}
