import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, type Message } from 'discord.js';

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
      return interaction.editReply(this.getStaffText(interaction.guild));
    } catch (error) {
      this.container.logger.error('Error in serverstaff:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: Message) {
    try {
      return message.reply(this.getStaffText(message.guild));
    } catch (error) {
      this.container.logger.error('Error in serverstaff:', error);
      return message.reply('An error occurred.');
    }
  }

  private getStaffText(guild: Message['guild'] | Command.ChatInputCommandInteraction['guild']): string {
    if (!guild) return 'This command can only be used in a server.';

    const staff = guild.members.cache
      .filter(
        (member) =>
          (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ModerateMembers)) &&
          !member.user.bot
      )
      .map((member) => member.user.tag);

    return `Staff: ${staff.join(', ') || 'None found'}`;
  }
}
