import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'roleinfo',
  description: 'Show role information',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class RoleinfoCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Show role information', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const roleName = interaction.options.getString('role', true); const role = interaction.guild?.roles.cache.find(r => r.name === roleName || r.id === roleName || r.name.toLowerCase().includes(roleName.toLowerCase())); if (!role) return interaction.editReply('Role not found.'); const embed = new EmbedBuilder().setColor((role.color || config.bot.embedColor.default) as ColorResolvable).setTitle('Role Info: ' + role.name).addFields({ name: 'ID', value: role.id, inline: true },{ name: 'Color', value: role.hexColor, inline: true },{ name: 'Position', value: role.position.toString(), inline: true },{ name: 'Members', value: role.members.size.toString(), inline: true },{ name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },{ name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },{ name: 'Created', value: '<t:' + Math.floor(role.createdTimestamp / 1000) + ':R>', inline: true }); return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Error in roleinfo:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: import('discord.js').Message) {
    try {
      const roleName = message.content.split(/\s+/).slice(1).join(' '); if (!roleName) return message.reply('Usage: roleinfo <role name/ID>'); const role = message.guild?.roles.cache.find(r => r.name === roleName || r.id === roleName || r.name.toLowerCase().includes(roleName.toLowerCase())); if (!role) return message.reply('Role not found.'); const embed = new EmbedBuilder().setColor((role.color || config.bot.embedColor.default) as ColorResolvable).setTitle('Role Info: ' + role.name).addFields({ name: 'ID', value: role.id, inline: true },{ name: 'Color', value: role.hexColor, inline: true },{ name: 'Position', value: role.position.toString(), inline: true },{ name: 'Members', value: role.members.size.toString(), inline: true },{ name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },{ name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },{ name: 'Created', value: '<t:' + Math.floor(role.createdTimestamp / 1000) + ':R>', inline: true }); return message.reply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Error in roleinfo:', error);
      return message.reply('An error occurred.');
    }
  }
}
