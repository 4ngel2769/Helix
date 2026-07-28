import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import type { Message } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'aliases',
  description: 'Show all command aliases',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class AliasesCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Show all command aliases', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      return interaction.editReply(this.buildAliasesText(interaction.client.stores.get('commands').values()));
    } catch (error) {
      this.container.logger.error('Error in aliases:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: Message) {
    try {
      return message.reply(this.buildAliasesText(message.client.stores.get('commands').values()));
    } catch (error) {
      this.container.logger.error('Error in aliases:', error);
      return message.reply('An error occurred.');
    }
  }

  private buildAliasesText(commands: Iterable<unknown>): string {
    const aliasesList: string[] = [];

    for (const command of commands) {
      if (!command || typeof command !== 'object') continue;
      if (!('name' in command) || !('aliases' in command)) continue;

      const name = command.name;
      const aliases = command.aliases;
      if (typeof name !== 'string' || !Array.isArray(aliases) || aliases.length === 0) continue;

      aliasesList.push(`${name}: ${aliases.join(', ')}`);
    }

    return aliasesList.length > 0 ? `Command aliases:\n${aliasesList.join('\n')}` : 'No aliases configured.';
  }
}
