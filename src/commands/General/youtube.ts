import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable, type Message } from 'discord.js';
import config from '../../config';

@ApplyOptions<Command.Options>({
  name: 'youtube',
  description: 'Search YouTube',
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class YoutubeCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Search YouTube', enabled: true });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      b.setName(this.name).setDescription(this.description)
        .addStringOption((o) => o.setName('query').setDescription('Search query').setRequired(true))
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const query = interaction.options.getString('query', true);
    await interaction.deferReply();
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return interaction.editReply('YouTube API key not configured.');
    try {
      const res = await fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&q=' + encodeURIComponent(query) + '&type=video&maxResults=5&key=' + apiKey);
      const data: any = await res.json();
      if (!data.items?.length) return interaction.editReply('No results found.');
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor.default as ColorResolvable)
        .setTitle('YouTube Search Results')
        .setDescription(data.items.slice(0, 5).map((v: any, i: number) => (i + 1) + '. [' + (v as any).snippet.title + '](https://youtu.be/' + (v as any).id.videoId + ')').join('\n'));
      return interaction.editReply({ embeds: [embed] });
    } catch {
      return interaction.editReply({ content: 'Search failed. Check API key.' });
    }
  }

  public override async messageRun(message: Message) {
    const query = message.content.split(/\\s+/).slice(1).join(' ');
    if (!query) return message.reply('Provide a search query.');
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return message.reply('YouTube API key not configured.');
    try {
      const res = await fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&q=' + encodeURIComponent(query) + '&type=video&maxResults=5&key=' + apiKey);
      const data: any = await res.json();
      if (!data.items?.length) return message.reply('No results found.');
      const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor.default as ColorResolvable)
        .setTitle('YouTube Search Results')
        .setDescription(data.items.slice(0, 5).map((v: any, i: number) => (i + 1) + '. [' + v.snippet.title + '](https://youtu.be/' + v.id.videoId + ')').join('\n'));
      return message.reply({ embeds: [embed] });
    } catch {
      return message.reply('Search failed. Check API key.');
    }
  }
}
