import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'members',
  description: 'Show member count',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class MembersCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Show member count', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const guild = interaction.guild; if (!guild) return interaction.editReply('This command can only be used in a server.'); const total = guild.memberCount; const humans = guild.members.cache.filter((m: any) => !m.user.bot).size; const bots = guild.members.cache.filter((m: any) => m.user.bot).size; return interaction.editReply('Total members: ' + total + ' (' + humans + ' humans, ' + bots + ' bots)');
    } catch (error) {
      this.container.logger.error('Error in members:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: import('discord.js').Message) {
    try {
      const guild = message.guild; if (!guild) return message.reply('This command can only be used in a server.'); const total = guild.memberCount; const humans = guild.members.cache.filter((m: any) => !m.user.bot).size; const bots = guild.members.cache.filter((m: any) => m.user.bot).size; return message.reply('Total members: ' + total + ' (' + humans + ' humans, ' + bots + ' bots)');
    } catch (error) {
      this.container.logger.error('Error in members:', error);
      return message.reply('An error occurred.');
    }
  }
}
