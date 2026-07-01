import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'permissions',
  description: 'Show a user\'s permissions',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class PermissionsCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Show a user\'s permissions', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const member = (interaction.options.getMember('user') || interaction.member) as any; if (!member) return interaction.editReply('Member not found.'); const perms = (member.permissions as any).toArray().filter((p: string) => !p.startsWith('View') && !p.startsWith('Read')); const mid = Math.ceil(perms.length / 2); const desc = perms.length ? perms.slice(0, mid).map((p: string) => '`' + p + '`').join('\n') : 'No permissions found'; const embed = new EmbedBuilder().setColor(config.bot.embedColor.default as ColorResolvable).setTitle(member.user.tag + "'s Permissions").setDescription(desc); if (perms.length > mid) embed.addFields({ name: '\u200b', value: perms.slice(mid).map((p: string) => '`' + p + '`').join('\n'), inline: true }); return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Error in permissions:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: import('discord.js').Message) {
    try {
      const member = (message.mentions.members?.first() || message.member) as any; if (!member) return message.reply('Member not found.'); const perms = (member.permissions as any).toArray().filter((p: string) => !p.startsWith('View') && !p.startsWith('Read')); const mid = Math.ceil(perms.length / 2); const desc = perms.length ? perms.slice(0, mid).map((p: string) => '`' + p + '`').join('\n') : 'No permissions found'; const embed = new EmbedBuilder().setColor(config.bot.embedColor.default as ColorResolvable).setTitle(member.user.tag + "'s Permissions").setDescription(desc); if (perms.length > mid) embed.addFields({ name: '\u200b', value: perms.slice(mid).map((p: string) => '`' + p + '`').join('\n'), inline: true }); return message.reply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Error in permissions:', error);
      return message.reply('An error occurred.');
    }
  }
}
