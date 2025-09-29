import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { EmbedBuilder, ColorResolvable, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { DevNote } from '../models/DevNote';
import { findAll, countDocuments, findById, deleteById } from '../lib/utils/mongooseUtils';
import config from '../config';

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class DevNotesButtonHandler extends InteractionHandler {
    public override parse(interaction: ButtonInteraction) {
        // Handle all dev notes related buttons
        const devNoteButtons = [
            'note_back',
            interaction.customId.startsWith('note_prev_'),
            interaction.customId.startsWith('note_next_'),
            interaction.customId.startsWith('note_delete_')
        ];

        if (!devNoteButtons.some(condition => condition === true || condition === interaction.customId)) {
            return this.none();
        }
        
        return this.some();
    }

    public async run(interaction: ButtonInteraction) {
        if (interaction.customId.startsWith('note_prev_') || interaction.customId.startsWith('note_next_')) {
            await this.handleNotePagination(interaction);
        } else if (interaction.customId === 'note_back') {
            await this.handleNoteBack(interaction);
        } else if (interaction.customId.startsWith('note_delete_')) {
            await this.handleNoteDelete(interaction);
        }
    }

    private extractNoteTitle(content: string): string {
        const lines = content.split('\n');
        const firstLine = lines[0].trim();
        
        if (firstLine.startsWith('#')) {
            return firstLine.replace(/^#+\s*/, '').trim();
        }
        
        const words = firstLine.split(' ');
        if (words.length > 7) {
            return words.slice(0, 7).join(' ') + '...';
        }
        
        return firstLine || 'Untitled Note';
    }

    private async handleNotePagination(interaction: ButtonInteraction) {
        await interaction.deferUpdate();
        
        try {
            const customIdParts = interaction.customId.split('_');
            const direction = customIdParts[1];
            const currentPage = parseInt(customIdParts[2]);
            const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
            
            const pageSize = 10;
            const totalNotes = await countDocuments(DevNote);
            const totalPages = Math.ceil(totalNotes / pageSize);
            
            if (newPage < 0 || newPage >= totalPages) {
                return;
            }
            
            const notes = await findAll(DevNote, {
                sort: { createdAt: -1 },
                skip: newPage * pageSize,
                limit: pageSize
            });
            
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle('📝 Developer Notes')
                .setDescription(`Page ${newPage + 1} of ${totalPages} (${totalNotes} total notes)`)
                .setTimestamp();
                
            notes.forEach((note, index) => {
                const noteNumber = newPage * pageSize + index + 1;
                const noteTitle = this.extractNoteTitle(note.content);
                
                let fieldValue = `**ID:** \`${note._id}\``;
                fieldValue += `\n**Created:** <t:${Math.floor(note.createdAt.getTime() / 1000)}:R>`;
                
                if (note.suggestedBy) {
                    fieldValue += `\n**Suggested by:** <@${note.suggestedBy}>`;
                }
                
                embed.addFields([{
                    name: `${noteNumber}. ${noteTitle}`,
                    value: fieldValue,
                    inline: false
                }]);
            });
            
            const buttons = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`note_prev_${newPage}`)
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(newPage === 0),
                    new ButtonBuilder()
                        .setCustomId(`note_next_${newPage}`)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(newPage >= totalPages - 1)
                );
                
            const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('note_select')
                        .setPlaceholder('Select a note to view/delete')
                        .addOptions(
                            notes.map((note) => {
                                const noteTitle = this.extractNoteTitle(note.content);
                                return {
                                    label: noteTitle.length > 50 
                                        ? `${noteTitle.substring(0, 47)}...` 
                                        : noteTitle,
                                    description: `Created ${new Date(note.createdAt).toLocaleDateString()}`,
                                    value: note._id.toString()
                                };
                            })
                        )
                );
                
            const components: (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] = [buttons];
            if (notes.length > 0) {
                components.push(selectMenu);
            }
            
            return interaction.editReply({ embeds: [embed], components });
        } catch (error) {
            console.error('Error navigating notes:', error);
            return interaction.editReply({ 
                content: 'Failed to navigate notes. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    private async handleNoteBack(interaction: ButtonInteraction) {
        await interaction.deferUpdate();
        
        try {
            const pageSize = 10;
            const page = 0;
            const totalNotes = await countDocuments(DevNote);
            const totalPages = Math.ceil(totalNotes / pageSize);
            
            if (totalNotes === 0) {
                return interaction.editReply({
                    content: 'No notes found.',
                    embeds: [],
                    components: []
                });
            }
            
            const notes = await findAll(DevNote, {
                sort: { createdAt: -1 },
                skip: page * pageSize,
                limit: pageSize
            });
            
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle('📝 Developer Notes')
                .setDescription(`Page ${page + 1} of ${totalPages} (${totalNotes} total notes)`)
                .setTimestamp();
                
            notes.forEach((note, index) => {
                const noteNumber = page * pageSize + index + 1;
                const noteTitle = this.extractNoteTitle(note.content);
                
                let fieldValue = `**ID:** \`${note._id}\``;
                fieldValue += `\n**Created:** <t:${Math.floor(note.createdAt.getTime() / 1000)}:R>`;
                
                if (note.suggestedBy) {
                    fieldValue += `\n**Suggested by:** <@${note.suggestedBy}>`;
                }
                
                embed.addFields([{
                    name: `${noteNumber}. ${noteTitle}`,
                    value: fieldValue,
                    inline: false
                }]);
            });
            
            const buttons = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`note_prev_${page}`)
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId(`note_next_${page}`)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page >= totalPages - 1)
                );
                
            const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('note_select')
                        .setPlaceholder('Select a note to view/delete')
                        .addOptions(
                            notes.map((note) => ({
                                label: note.content.length > 50 
                                    ? `${note.content.substring(0, 47)}...` 
                                    : note.content,
                                description: `Created ${new Date(note.createdAt).toLocaleDateString()}`,
                                value: note._id.toString()
                            }))
                        )
                );
                
            const components: (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] = [buttons];
            if (notes.length > 0) {
                components.push(selectMenu);
            }
            
            return interaction.editReply({ embeds: [embed], components });
        } catch (error) {
            console.error('Error returning to notes list:', error);
            return interaction.editReply({ 
                content: 'Failed to return to notes list. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    private async handleNoteDelete(interaction: ButtonInteraction) {
        await interaction.deferUpdate();
        
        const noteId = interaction.customId.replace('note_delete_', '');
        
        try {
            const note = await findById(DevNote, noteId);
            
            if (!note) {
                return interaction.editReply({
                    content: 'Note not found or already deleted.',
                    embeds: [],
                    components: []
                });
            }
            
            await deleteById(DevNote, noteId);
            
            const embed = new EmbedBuilder()
                .setColor('#ff4444')
                .setTitle('🗑️ Note Deleted')
                .setDescription(note.content)
                .addFields([{
                    name: 'Deleted Note ID',
                    value: noteId,
                    inline: true
                }])
                .setTimestamp();
                
            return interaction.editReply({
                embeds: [embed],
                components: []
            });
        } catch (error) {
            console.error('Error deleting note:', error);
            return interaction.editReply({
                content: 'An error occurred while deleting the note.',
                embeds: [],
                components: []
            });
        }
    }
}
