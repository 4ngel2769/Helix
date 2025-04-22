import { ApplyOptions } from '@sapphire/decorators';
import {
	InteractionHandler,
	InteractionHandlerTypes
} from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { MessageFlags } from 'discord-api-types/v10';
import { Guild } from '../models/Guild';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public async run(interaction: ButtonInteraction) {
		switch (interaction.customId) {
			case 'verify-button':
				await this.handleVerification(interaction);
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
		const validButtonIds = ['my-awesome-button', 'verify-button'];
		
		if (!validButtonIds.includes(interaction.customId)) return this.none();
		return this.some();
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
