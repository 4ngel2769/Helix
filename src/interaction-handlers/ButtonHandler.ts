import { ApplyOptions } from '@sapphire/decorators';
import {
	InteractionHandler,
	InteractionHandlerTypes
} from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { MessageFlags } from 'discord-api-types/v10';
import { Guild } from '../models/Guild';
import { 
	EmbedBuilder, 
	ColorResolvable,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle
} from 'discord.js';
import config from '../config';
import'node-fetch';

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

			default:
				await interaction.reply({
					content: 'Unknown button interaction.',
					flags: MessageFlags.Ephemeral
				});
		}
	}

	public override parse(interaction: ButtonInteraction) {
		// List all valid button IDs
		const validButtonIds = ['my-awesome-button', 'verify-button', 'new-meme'];
		
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
				.setTitle(`🤣 ${meme.title}`)
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
}
