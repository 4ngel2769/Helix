import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { EmbedBuilder, ColorResolvable, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import config from '../config';

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

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class MemeButtonHandler extends InteractionHandler {
    public override parse(interaction: ButtonInteraction) {
        if (interaction.customId !== 'new-meme') return this.none();
        return this.some();
    }

    public async run(interaction: ButtonInteraction) {
        await interaction.deferUpdate();
        
        try {
            const meme = await this.fetchRandomMeme();
            
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle(meme.title)
                .setURL(meme.postLink)
                .setImage(meme.url)
                .setFooter({ text: `👍 ${meme.ups} • Posted by u/${meme.author} in r/${meme.subreddit}` })
                .setTimestamp();

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

    private async fetchRandomMeme(): Promise<RedditMemeResponse> {
        const response = await fetch('https://meme-api.com/gimme');
        if (!response.ok) {
            throw new Error(`Failed to fetch meme: ${response.status} ${response.statusText}`);
        }
        return await response.json() as RedditMemeResponse;
    }
}
