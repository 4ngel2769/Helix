import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'inviteme',
  description: 'Get bot invite link',
  aliases: ['invite'],
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class InvitemeCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Get bot invite link', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const embed = new EmbedBuilder().setColor(config.bot.embedColor.default as ColorResolvable).setTitle('Invite Me').setDescription('Add Helix to your server!').setURL('https://discord.com/oauth2/authorize?client_id=' + config.bot.client.id + '&scope=bot+applications.commands&permissions=8'); return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Error in inviteme:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: import('discord.js').Message) {
    try {
      const embed = new EmbedBuilder().setColor(config.bot.embedColor.default as ColorResolvable).setTitle('Invite Me').setDescription('Add Helix to your server!').setURL('https://discord.com/oauth2/authorize?client_id=' + config.bot.client.id + '&scope=bot+applications.commands&permissions=8'); return message.reply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Error in inviteme:', error);
      return message.reply('An error occurred.');
    }
  }
}
