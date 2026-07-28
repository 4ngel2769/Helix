import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Guild } from '../../../models/Guild';
import { getGuildPrefixFromCache, setGuildPrefixInCache } from '../../../lib/utils/prefixCache';

@ApplyOptions<Command.Options>({
  name: 'prefix',
  description: 'Show current command prefix',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class PrefixCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Show current command prefix', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const prefix = await this.resolvePrefix(interaction.guildId);
      return interaction.editReply(`Current prefix: \`${prefix}\``);
    } catch (error) {
      this.container.logger.error('Error in prefix:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: import('discord.js').Message) {
    try {
      const prefix = await this.resolvePrefix(message.guildId);
      return message.reply(`Current prefix: \`${prefix}\``);
    } catch (error) {
      this.container.logger.error('Error in prefix:', error);
      return message.reply('An error occurred.');
    }
  }

  private async resolvePrefix(guildId: string | null): Promise<string> {
    const configuredDefaultPrefix = this.container.client.options.defaultPrefix;
    const defaultPrefix =
      (Array.isArray(configuredDefaultPrefix) ? configuredDefaultPrefix[0] : configuredDefaultPrefix) || 'x';

    if (!guildId) return defaultPrefix;

    const cached = getGuildPrefixFromCache(guildId);
    if (cached) return cached;

    const guildData = await Guild.findOne({ guildId }, { prefix: 1 }).lean();
    const resolvedPrefix = guildData?.prefix || defaultPrefix;
    setGuildPrefixInCache(guildId, resolvedPrefix);

    return resolvedPrefix;
  }
}
