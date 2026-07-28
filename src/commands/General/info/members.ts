import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import type { Message } from 'discord.js';

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
      return interaction.editReply(this.getMemberCountText(interaction.guild));
    } catch (error) {
      this.container.logger.error('Error in members:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: Message) {
    try {
      return message.reply(this.getMemberCountText(message.guild));
    } catch (error) {
      this.container.logger.error('Error in members:', error);
      return message.reply('An error occurred.');
    }
  }

  private getMemberCountText(guild: Message['guild'] | Command.ChatInputCommandInteraction['guild']): string {
    if (!guild) return 'This command can only be used in a server.';

    const total = guild.memberCount;
    const humans = guild.members.cache.filter((member) => !member.user.bot).size;
    const bots = guild.members.cache.filter((member) => member.user.bot).size;

    return `Total members: ${total} (${humans} humans, ${bots} bots)`;
  }
}
