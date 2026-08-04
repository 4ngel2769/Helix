import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable, type Message, version as discordJsVersion } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'botinfo',
  description: 'Show bot information',
  aliases: ['info'],
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
      return interaction.editReply({ embeds: [this.buildBotInfoEmbed(interaction.client.guilds.cache.size, interaction.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0))] });
    } catch (error) {
      this.container.logger.error('Error in botinfo:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: Message) {
    try {
      return message.reply({ embeds: [this.buildBotInfoEmbed(message.client.guilds.cache.size, message.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0))] });
    } catch (error) {
      this.container.logger.error('Error in botinfo:', error);
      return message.reply('An error occurred.');
    }
  }

  private buildBotInfoEmbed(serverCount: number, userCount: number) {
    return new EmbedBuilder()
      .setColor(config.bot.embedColor.default as ColorResolvable)
      .setTitle('Helix Bot Info')
      .setDescription('A feature-rich Discord bot built with Sapphire Framework')
      .addFields(
        { name: 'Version', value: config.bot.version, inline: true },
        { name: 'Library', value: discordJsVersion, inline: true },
        { name: 'Uptime', value: this.formatUptime(process.uptime()), inline: true },
        { name: 'Servers', value: serverCount.toString(), inline: true },
        { name: 'Users', value: userCount.toString(), inline: true },
        { name: 'Memory', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true }
      )
      .setTimestamp();
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
  }
}
