import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import type { Message } from 'discord.js';

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
      return interaction.editReply(this.getEmojisText(interaction.guild));
    } catch (error) {
      this.container.logger.error('Error in emojis:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: Message) {
    try {
      return message.reply(this.getEmojisText(message.guild));
    } catch (error) {
      this.container.logger.error('Error in emojis:', error);
      return message.reply('An error occurred.');
    }
  }

  private getEmojisText(guild: Message['guild'] | Command.ChatInputCommandInteraction['guild']): string {
    if (!guild) return 'This command can only be used in a server.';
    if (!guild.emojis.cache.size) return 'No custom emojis in this server.';

    return `Emojis: ${guild.emojis.cache.map((emoji) => emoji.toString()).join(' ')}`;
  }
}
