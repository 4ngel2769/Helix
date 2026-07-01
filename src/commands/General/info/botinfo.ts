import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'botinfo',
  description: 'Show bot information',
  aliases: ['stats'],
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class BotinfoCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Show bot information', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const embed = new EmbedBuilder().setColor(config.bot.embedColor.default as ColorResolvable).setTitle('Helix Bot Info').setDescription('A feature-rich Discord bot built with Sapphire Framework').addFields({ name: 'Version', value: config.bot.version, inline: true },{ name: 'Library', value: require('discord.js').version, inline: true },{ name: 'Uptime', value: formatUptime(process.uptime()), inline: true },{ name: 'Servers', value: interaction.client.guilds.cache.size.toString(), inline: true },{ name: 'Users', value: interaction.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0).toString(), inline: true },{ name: 'Memory', value: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB', inline: true }).setTimestamp(); return interaction.editReply({ embeds: [embed] }); function formatUptime(s: number) { const d = Math.floor(s / 86400); s %= 86400; const h = Math.floor(s / 3600); s %= 3600; const m = Math.floor(s / 60); return d + 'd ' + h + 'h ' + m + 'm ' + Math.floor(s % 60) + 's'; }
    } catch (error) {
      this.container.logger.error('Error in botinfo:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: import('discord.js').Message) {
    try {
      const embed = new EmbedBuilder().setColor(config.bot.embedColor.default as ColorResolvable).setTitle('Helix Bot Info').setDescription('A feature-rich Discord bot built with Sapphire Framework').addFields({ name: 'Version', value: config.bot.version, inline: true },{ name: 'Library', value: require('discord.js').version, inline: true },{ name: 'Uptime', value: formatUptime(process.uptime()), inline: true },{ name: 'Servers', value: message.client.guilds.cache.size.toString(), inline: true },{ name: 'Users', value: message.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0).toString(), inline: true },{ name: 'Memory', value: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB', inline: true }).setTimestamp(); return message.reply({ embeds: [embed] }); function formatUptime(s: number) { const d = Math.floor(s / 86400); s %= 86400; const h = Math.floor(s / 3600); s %= 3600; const m = Math.floor(s / 60); return d + 'd ' + h + 'h ' + m + 'm ' + Math.floor(s % 60) + 's'; }
    } catch (error) {
      this.container.logger.error('Error in botinfo:', error);
      return message.reply('An error occurred.');
    }
  }
}
