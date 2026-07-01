import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../../config';

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
      const aliasesList = interaction.client.stores.get('commands').map((c: any) => c.aliases?.length ? c.name + ': ' + c.aliases.join(', ') : null).filter((x: any) => x); return interaction.editReply(aliasesList.length ? 'Command aliases:\n' + aliasesList.join('\n') : 'No aliases configured.');
    } catch (error) {
      this.container.logger.error('Error in aliases:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: import('discord.js').Message) {
    try {
      const aliasesList = message.client.stores.get('commands').map((c: any) => c.aliases?.length ? c.name + ': ' + c.aliases.join(', ') : null).filter((x: any) => x); return message.reply(aliasesList.length ? 'Command aliases:\n' + aliasesList.join('\n') : 'No aliases configured.');
    } catch (error) {
      this.container.logger.error('Error in aliases:', error);
      return message.reply('An error occurred.');
    }
  }
}
