import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder,
    StringSelectMenuBuilder,
    ButtonStyle,
    ComponentType,
    MessageFlags,
    ColorResolvable,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import { DevNote, IDevNote } from '../../models/DevNote';
import config from '../../config';
import * as mongooseUtils from '../../lib/utils/mongooseUtils';

@ApplyOptions<Command.Options>({
    name: 'note',
    description: 'Manage developer notes and to-dos',
    preconditions: ['OwnerOnly']
})
export class NoteCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setContexts(0, 1, 2)
                .setIntegrationTypes(0, 1)
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('add')
                        .setDescription('Add a new note or to-do')
                        .addUserOption((option) =>
                            option
                                .setName('suggested_by')
                                .setDescription('User who suggested this note')
                                .setRequired(false)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('list')
                        .setDescription('List all your notes')
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('delete')
                        .setDescription('Delete a note')
                        .addStringOption((option) =>
                            option
                                .setName('note')
                                .setDescription('The note to delete')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'add':
                return this.handleAdd(interaction);
            case 'list':
                return this.handleList(interaction);
            case 'delete':
                return this.handleDelete(interaction);
            default:
                return interaction.reply({ 
                    content: 'Unknown subcommand.', 
                    flags: MessageFlags.Ephemeral 
                });
        }
    }

    public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
        const focusedOption = interaction.options.getFocused(true);

        if (focusedOption.name === 'note') {
            const notes = await mongooseUtils.findAll(DevNote, {
                sort: { createdAt: -1 },
                limit: 25
            });

            const filtered = notes.filter(note => 
                note.content.toLowerCase().includes(focusedOption.value.toLowerCase())
            );

            return interaction.respond(
                filtered.map(note => ({
                    name: note.content.length > 100 
                        ? `${note.content.substring(0, 97)}...` 
                        : note.content,
                    value: note._id.toString()
                }))
            );
        }
    }

    private async handleAdd(interaction: Command.ChatInputCommandInteraction) {
        const suggestedBy = interaction.options.getUser('suggested_by');
        
        // Create a modal for markdown input
        const modal = new ModalBuilder()
            .setCustomId(`note_add_modal${suggestedBy ? '_' + suggestedBy.id : ''}`)
            .setTitle('Add Developer Note');

        const contentInput = new TextInputBuilder()
            .setCustomId('noteContent')
            .setLabel('Note Content (supports Markdown)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Type your note here with Markdown.')
            .setRequired(true)
            .setMaxLength(4000);
            
        const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(contentInput);
        
        modal.addComponents(firstActionRow);
        
        await interaction.showModal(modal);
        
        try {
            const filter = (i: any) => 
                i.customId === `note_add_modal${suggestedBy ? '_' + suggestedBy.id : ''}` && 
                i.user.id === interaction.user.id;
                
            const modalSubmit = await interaction.awaitModalSubmit({
                filter,
                time: 300000 // 5 min
            });
            
            const content = modalSubmit.fields.getTextInputValue('noteContent');
            
            const note = new DevNote({
                content,
                suggestedBy: suggestedBy?.id
            });
            
            await note.save();
            
            // Create response embed
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default as ColorResolvable)
                .setTitle('📝 Note Added')
                .setDescription(content)
                .addFields([
                    { 
                        name: 'ID', 
                        value: note._id.toString(), 
                        inline: true 
                    },
                    { 
                        name: 'Created', 
                        value: `<t:${Math.floor(note.createdAt.getTime() / 1000)}:R>`, 
                        inline: true 
                    }
                ])
                .setTimestamp();
                
            if (suggestedBy) {
                embed.addFields([{
                    name: 'Suggested By',
                    value: `<@${suggestedBy.id}>`,
                    inline: true
                }]);
            }
            
            return modalSubmit.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            
        } catch (error) {
            console.error('Error with note modal:', error);
            // Don't send an error message as the user might exit the modal
            return;
        }
    }

    private async handleList(interaction: Command.ChatInputCommandInteraction, page: number = 0) {
        try {
            const pageSize = 10;
            const totalNotes = await mongooseUtils.countDocuments(DevNote);
            const totalPages = Math.ceil(totalNotes / pageSize);

            if (totalNotes === 0) {
                return interaction.reply({ 
                    content: 'No notes found.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            const notes = await mongooseUtils.findAll(DevNote, {
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
                
                // Extract title from note content
                const noteTitle = this.extractNoteTitle(note.content);
                
                // Build field value with only essential info
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

            // Create pagination buttons
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

            // Create selection menu for notes on current page
            const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('note_select')
                        .setPlaceholder('Select a note to view/delete')
                        .addOptions(
                            notes.map((note, index) => {
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

            // Fix: Use proper typing for mixed components
            const components: (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] = [buttons];
            if (notes.length > 0) {
                components.push(selectMenu);
            }

            if (interaction.replied || interaction.deferred) {
                return interaction.editReply({ embeds: [embed], components });
            } else {
                return interaction.reply({ embeds: [embed], components, flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            console.error('Error listing notes:', error);
            return interaction.reply({ 
                content: 'Failed to list notes. Please try again.', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }

    private extractNoteTitle(content: string): string {
        const lines = content.split('\n');
        const firstLine = lines[0].trim();
        
        // Check if first line is a markdown header
        if (firstLine.startsWith('#')) {
            return firstLine.replace(/^#+\s*/, '').trim();
        }
        
        // If not a header, use first 7 words
        const words = firstLine.split(' ');
        if (words.length > 7) {
            return words.slice(0, 7).join(' ') + '...';
        }
        
        return firstLine || 'Untitled Note';
    }

    private async handleDelete(interaction: Command.ChatInputCommandInteraction) {
        const noteId = interaction.options.getString('note', true);

        try {
            const note = await mongooseUtils.findById(DevNote, noteId);
            
            if (!note) {
                return interaction.reply({ 
                    content: 'Note not found.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            await mongooseUtils.deleteById(DevNote, noteId);

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

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error('Error deleting note:', error);
            return interaction.reply({ 
                content: 'Failed to delete note. Please try again.', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
}