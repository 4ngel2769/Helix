import { container } from '@sapphire/framework';
import { MessageFlags, type ChatInputCommandInteraction, type TextChannel } from 'discord.js';
import { Guild } from '../../../models/Guild';

export async function handleDelete(interaction: ChatInputCommandInteraction) {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const messageId = interaction.options.getString('menu_id', true);
	const guildId = interaction.guildId!;

	const guildData = await Guild.findOne({ guildId, 'reactionRolesMenus.messageId': messageId });

	if (!guildData) {
		return interaction.editReply('Reaction roles menu not found.');
	}

	const menu = guildData.reactionRolesMenus?.find(m => m.messageId === messageId);

	if (!menu) {
		return interaction.editReply('Reaction roles menu not found.');
	}

	try {
		try {
			const channel = await interaction.guild?.channels.fetch(menu.channelId) as TextChannel;
			if (channel) {
				const message = await channel.messages.fetch(menu.messageId);
				if (message) {
					await message.delete();
				}
			}
		} catch (error) {
			container.logger.info('Could not delete message, it might have been deleted already.');
		}

		await Guild.updateOne(
			{ guildId },
			{ $pull: { reactionRolesMenus: { messageId } } }
		);

		return interaction.editReply(`Successfully deleted reaction roles menu "${menu.title}".`);

	} catch (error) {
		container.logger.error('Error deleting reaction roles menu:', error);
		return interaction.editReply('An error occurred while deleting the reaction roles menu.');
	}
}
