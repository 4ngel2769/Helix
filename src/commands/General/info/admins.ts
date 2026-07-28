import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, type Message } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'admins',
  description: 'List server admins',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class AdminsCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'List server admins', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      return interaction.editReply(this.getAdminsText(interaction.guild));
    } catch (error) {
      this.container.logger.error('Error in admins:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: Message) {
    try {
      return message.reply(this.getAdminsText(message.guild));
    } catch (error) {
      this.container.logger.error('Error in admins:', error);
      return message.reply('An error occurred.');
    }
  }

  private getAdminsText(guild: Message['guild'] | Command.ChatInputCommandInteraction['guild']): string {
    if (!guild) return 'This command can only be used in a server.';

    const admins = guild.members.cache
      .filter((member) => member.permissions.has(PermissionFlagsBits.Administrator) && !member.user.bot)
      .map((member) => member.user.tag);

    return `Server admins: ${admins.join(', ') || 'None found'}`;
  }
}
