import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, type Message } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'mods',
  description: 'List server moderators',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class ModsCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'List server moderators', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      return interaction.editReply(this.getModeratorsText(interaction.guild));
    } catch (error) {
      this.container.logger.error('Error in mods:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: Message) {
    try {
      return message.reply(this.getModeratorsText(message.guild));
    } catch (error) {
      this.container.logger.error('Error in mods:', error);
      return message.reply('An error occurred.');
    }
  }

  private getModeratorsText(guild: Message['guild'] | Command.ChatInputCommandInteraction['guild']): string {
    if (!guild) return 'This command can only be used in a server.';

    const moderators = guild.members.cache
      .filter((member) => member.permissions.has(PermissionFlagsBits.ModerateMembers) && !member.user.bot)
      .map((member) => member.user.tag);

    return `Server moderators: ${moderators.join(', ') || 'None found'}`;
  }
}
