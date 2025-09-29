import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { StringSelectMenuInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ColorResolvable } from 'discord.js';
import { DevNote, IDevNote } from '../models/DevNote';
import config from '../config';
import { envParseArray } from '@skyra/env-utilities';
import * as mongooseUtils from '../lib/utils/mongooseUtils';

const OWNERS = envParseArray('OWNERS');

export class NoteSelectHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.Context, options: InteractionHandler.Options) {
        super(context, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.SelectMenu
        });
    }

    public override parse(interaction: StringSelectMenuInteraction) {
        if (interaction.customId !== 'note_select') return this.none();
        return this.some();
    }

    public async run(interaction: StringSelectMenuInteraction) {
        // Only allow owners to use this
        if (!OWNERS.includes(interaction.user.id)) {
            return interaction.reply({
                content: 'Only developers can use this.',
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferUpdate();

        try {
            const noteId = interaction.values[0];
            
            // Use the helper function instead of direct mongoose call
            const note = await mongooseUtils.findById(DevNote, noteId);

            if (!note) {
                return interaction.editReply({
                    content: 'Note not found.',
                    embeds: [],
                    components: []
                });
            }

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle('📝 Note Details')
                .setDescription(note.content)
                .addFields([
                    {
                        name: 'ID',
                        value: note._id.toString(),
                        inline: true
                    },
                    {
                        name: 'Created',
                        value: `<t:${Math.floor(note.createdAt.getTime() / 1000)}:F>`,
                        inline: true
                    }
                ])
                .setTimestamp();

            if (note.suggestedBy) {
                embed.addFields([{
                    name: 'Suggested By',
                    value: `<@${note.suggestedBy}>`,
                    inline: true
                }]);
            }

            const buttons = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('note_back')
                        .setLabel('Back to List')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⬅️'),
                    new ButtonBuilder()
                        .setCustomId(`note_delete_${noteId}`)
                        .setLabel('Delete Note')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️')
                );

            return interaction.editReply({
                embeds: [embed],
                components: [buttons]
            });

        } catch (error) {
            console.error('Error handling note selection:', error);
            return interaction.editReply({
                content: 'An error occurred while loading the note.',
                embeds: [],
                components: []
            });
        }
    }
}