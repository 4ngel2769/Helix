import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'serverstaff',
  description: 'List server staff members',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class ServerstaffCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'List server staff members', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const guild = interaction.guild; if (!guild) return interaction.editReply('This command can only be used in a server.'); const staff = guild.members.cache.filter((m: any) => (m.permissions.has('Administrator') || m.permissions.has('ModerateMembers')) && !m.user.bot); return interaction.editReply('Staff: ' + (staff.map(m => m.user.tag).join(', ') || 'None found'));
    } catch (error) {
      this.container.logger.error('Error in serverstaff:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: import('discord.js').Message) {
    try {
      const guild = message.guild; if (!guild) return message.reply('This command can only be used in a server.'); const staff = guild.members.cache.filter((m: any) => (m.permissions.has('Administrator') || m.permissions.has('ModerateMembers')) && !m.user.bot); return message.reply('Staff: ' + (staff.map(m => m.user.tag).join(', ') || 'None found'));
    } catch (error) {
      this.container.logger.error('Error in serverstaff:', error);
      return message.reply('An error occurred.');
    }
  }
}
