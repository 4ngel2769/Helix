import { ApplyOptions } from '@sapphire/decorators';
import {
    InteractionHandler,
    InteractionHandlerTypes
} from '@sapphire/framework';
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
import 'node-fetch';

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

// Cast the config to the proper type
const config = configModule as Config;

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public async run(interaction: ButtonInteraction) {
		switch (interaction.customId) {
			case 'verify-button':
				await this.handleVerification(interaction);
				break;

			case 'new-meme':
				await this.handleNewMeme(interaction);
				break;

			case 'my-awesome-button':
				await interaction.reply({
					content: 'Hello from a button interaction handler!',
					flags: MessageFlags.Ephemeral
				});
				break;

			// Add to the switch statement in ButtonHandler.ts run method:
			case 'note_select':
				// This will be handled by the select menu, not button
				break;

			default:
				// Handle note pagination buttons
				if (interaction.customId.startsWith('note_prev_') || interaction.customId.startsWith('note_next_')) {
					await this.handleNotePagination(interaction);
					break;
				}
				
				if (interaction.customId === 'note_back') {
					await this.handleNoteActions(interaction);
					break;
				}
				
				// Fix for delete button - now checking for note_delete_[noteId]
				if (interaction.customId.startsWith('note_delete_')) {
					await this.handleNoteDelete(interaction);
					break;
				}

				await interaction.reply({
					content: 'Unknown button interaction.',
					flags: MessageFlags.Ephemeral
				});
		}
	}

	public override parse(interaction: ButtonInteraction) {
		// List all valid button IDs
		const validButtonIds = ['my-awesome-button', 'verify-button', 'new-meme'];
		
		// Handle note buttons with dynamic IDs
		if (interaction.customId.startsWith('note_prev_') || 
			interaction.customId.startsWith('note_next_') || 
			interaction.customId === 'note_back' || 
			interaction.customId.startsWith('note_delete_')) {
			return this.some();
		}
		
		if (!validButtonIds.includes(interaction.customId)) return this.none();
		return this.some();
	}

	private async handleNewMeme(interaction: ButtonInteraction) {
		await interaction.deferUpdate();
		
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

	// Helper method to fetch a random meme from Reddit API
	private async fetchRandomMeme(): Promise<RedditMemeResponse> {
		const response = await fetch('https://meme-api.com/gimme');
		if (!response.ok) {
			throw new Error(`Failed to fetch meme: ${response.status} ${response.statusText}`);
		}
		return await response.json() as RedditMemeResponse;
	}

	private async handleVerification(interaction: ButtonInteraction) {
		const guildId = interaction.guildId!;
		const guildData = await Guild.findOne({ guildId });

		if (!guildData?.verificationRoleId || !guildData.isVerificationModule) {
			return interaction.reply({
				content: guildData?.verificationDisabledMessage || "⚠️ Verification is currently disabled. Please try again later.",
				flags: MessageFlags.Ephemeral
			});
		}

		const member = interaction.member;
		if (!member) return;
		// Check if user is already verified
		if (Array.isArray(member.roles)) {
			// Handle string[] case
			if (member.roles.includes(guildData.verificationRoleId)) {
				return interaction.reply({
					content: 'You are already verified!',
					flags: MessageFlags.Ephemeral
				});
			}
		} else {
			// Handle GuildMemberRoleManager case
			if (member.roles.cache.has(guildData.verificationRoleId)) {
				return interaction.reply({
					content: 'You are already verified!', 
					flags: MessageFlags.Ephemeral
				});
			}
		}
		try {
			if (Array.isArray(member.roles)) {
				return interaction.reply({
					content: 'Unable to verify you. Please contact a server administrator.',
					flags: MessageFlags.Ephemeral
				});
			}
			// Handle GuildMemberRoleManager case
			await member.roles.add(guildData.verificationRoleId);
			return interaction.reply({
				content: 'You have been successfully verified!',
				flags: MessageFlags.Ephemeral
			});
		} catch (error) {
			console.error('Failed to verify member:', error);
			return interaction.reply({
				content: 'Failed to verify you. Please contact a server administrator.',
				flags: MessageFlags.Ephemeral
			});
		}
	}

	private extractNoteTitle(content: string): string {
		const lines = content.split('\n');
		const firstLine = lines[0].trim();
		
		// Check if first line is a markdown header
		if (firstLine.startsWith('#')) {
			// Remove the # symbols and trim whitespace
			return firstLine.replace(/^#+\s*/, '').trim();
		}
		
		// If not a header, use first 7 words
		const words = firstLine.split(' ');
		if (words.length > 7) {
			return words.slice(0, 7).join(' ') + '...';
		}
		
		return firstLine || 'Untitled Note';
	}

	private async handleNotePagination(interaction: ButtonInteraction) {
		await interaction.deferUpdate();
		
		try {
			// Extract page info from button ID
			const customIdParts = interaction.customId.split('_');
			const direction = customIdParts[1]; // 'prev' or 'next'
			const currentPage = parseInt(customIdParts[2]);
			const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
			
			// Get notes for the new page
			const pageSize = 10;
			const totalNotes = await countDocuments(DevNote);
			const totalPages = Math.ceil(totalNotes / pageSize);
			
			if (newPage < 0 || newPage >= totalPages) {
				return; // Invalid page, do nothing
			}
			
			const notes = await findAll(DevNote, {
				sort: { createdAt: -1 },
				skip: newPage * pageSize,
				limit: pageSize
			});
			
			// Create the embed for notes list
			const embed = new EmbedBuilder()
				.setColor(config.bot.embedColor.default as ColorResolvable)
				.setTitle('📝 Developer Notes')
				.setDescription(`Page ${newPage + 1} of ${totalPages} (${totalNotes} total notes)`)
				.setTimestamp();
				
			notes.forEach((note, index) => {
				const noteNumber = newPage * pageSize + index + 1;
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
				
			// Create selection menu for notes
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
				
			// Create components array with type checking
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

	private async handleNoteActions(interaction: ButtonInteraction) {
		if (interaction.customId === 'note_back') {
			await interaction.deferUpdate();
			
			try {
				// Get notes for first page
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
				
				// Create the embed for notes list - use the globally imported config
				const embed = new EmbedBuilder()
					.setColor(config.bot.embedColor.default as ColorResolvable)
					.setTitle('📝 Developer Notes')
					.setDescription(`Page ${page + 1} of ${totalPages} (${totalNotes} total notes)`)
					.setTimestamp();
					
				notes.forEach((note, index) => {
					const noteNumber = page * pageSize + index + 1;
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
					
				// Create selection menu for notes
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
					
				// Create components array with type checking
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
	}

	private async handleNoteDelete(interaction: ButtonInteraction) {
		await interaction.deferUpdate();
		
		// Extract the note ID from the button custom ID
		const noteId = interaction.customId.replace('note_delete_', '');
		
		try {
			// Get the note to confirm deletion
			const { DevNote } = await import('../models/DevNote.js');
			const { findById, deleteById } = await import('../lib/utils/mongooseUtils.js');
			
			const note = await findById(DevNote, noteId);
			
			if (!note) {
				return interaction.editReply({
					content: 'Note not found or already deleted.',
					embeds: [],
					components: []
				});
			}
			
			// Delete the note
			await deleteById(DevNote, noteId);
			
			// Create confirmation embed
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
