import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { MessageFlags } from 'discord-api-types/v10';
import { Guild } from '../models/Guild.js';
import { 
    EmbedBuilder, 
    ColorResolvable,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} from 'discord.js';
import { Config } from '../config.js';
import configModule from '../config.js';
import { DevNote } from '../models/DevNote.js';
import { findAll, countDocuments, findById, deleteById } from '../lib/utils/mongooseUtils.js';

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

const config = configModule as Config;

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
    public override parse(interaction: ButtonInteraction) {
        // handle buttons that aren't handled by other specialized handlers
        const handledElsewhere = [
            'new-meme',
            'verify-button',
            'my-awesome-button',
            'note_back',
            interaction.customId.startsWith('note_prev_'),
            interaction.customId.startsWith('note_next_'),
            interaction.customId.startsWith('note_delete_')
        ];

        if (handledElsewhere.some(condition => condition === true || condition === interaction.customId)) {
            return this.none();
        }
        
        return this.some();
    }

    public async run(interaction: ButtonInteraction) {
        // Fallback for unknown buttons
        await interaction.reply({
            content: 'Unknown button interaction.',
            flags: MessageFlags.Ephemeral
        });
    }
}
