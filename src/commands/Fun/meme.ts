import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import 'node-fetch';
import { 
    EmbedBuilder, 
    ColorResolvable,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    // MessageFlags,
    type Message
} from 'discord.js';
import config from '../../config';

interface RedditMemeResponse {
    postLink: string;
    subreddit: string;
    title: string;
    url: string;
    nsfw: boolean;
    spoiler: boolean;
    author: string;
    ups: number;
    preview: string[];
}

@ApplyOptions<Command.Options>({
    name: 'meme',
    description: 'Get a random meme',
    fullCategory: ['Fun'],
    enabled: true,
    flags: true,
})
export class MemeCommand extends ModuleCommand<FunModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Fun',
            description: 'Get a random meme',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setIntegrationTypes(0,1)
                .setContexts(0,1,2)
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();
        
        try {
            const meme = await this.fetchRandomMeme();
            
            // Create embed for the meme
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle(`${meme.title}`)
                .setURL(meme.postLink)
                .setImage(meme.url)
                .setFooter({ text: `👍 ${meme.ups} • Posted by u/${meme.author} in r/${meme.subreddit}` })
                .setTimestamp();

            // Create a button to get a new meme
            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('new-meme')
                        .setLabel('New Meme')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄')
                );

            return interaction.editReply({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Error fetching meme:', error);
            return interaction.editReply({ content: 'Failed to fetch a meme. Please try again later.' });
        }
    }

    // Handle message commands (chat commands)
    public override async messageRun(message: Message) {
        const reply = await message.reply({ content: 'Fetching a random meme...' });
        
        try {
            const meme = await this.fetchRandomMeme();
            
            // Create embed for the meme
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle(`${meme.title}`)
                .setURL(meme.postLink)
                .setImage(meme.url)
                .setFooter({ text: `👍 ${meme.ups} • Posted by u/${meme.author} in r/${meme.subreddit}` })
                .setTimestamp();

            // Create a button to get a new meme
            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('new-meme')
                        .setLabel('New Meme')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄')
                );

            return reply.edit({ content: null, embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Error fetching meme:', error);
            return reply.edit({ content: 'Failed to fetch a meme. Please try again later.' });
        }
    }

    // Helper method to fetch a random meme from Reddit API
    private async fetchRandomMeme(): Promise<RedditMemeResponse> {
        const response = await fetch('https://meme-api.com/gimme');
        if (!response.ok) {
            throw new Error(`Failed to fetch meme: ${response.status} ${response.statusText}`);
        }
        return await response.json() as RedditMemeResponse;
    }
}