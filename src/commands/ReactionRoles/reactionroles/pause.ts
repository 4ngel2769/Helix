import { container } from '@sapphire/framework';
import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { Guild, type ReactionRolesMenu } from '../../../models/Guild';
import { updateReactionRoleMenuMessage } from '../../../lib/utils/reactionRolesHelpers';

export async function handlePause(interaction: ChatInputCommandInteraction) {
	return toggleMenuState(interaction, false);
}

export async function handleResume(interaction: ChatInputCommandInteraction) {
	return toggleMenuState(interaction, true);
}

async function toggleMenuState(
	interaction: ChatInputCommandInteraction,
	makeActive: boolean
) {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const menuId = interaction.options.getString('menu_id', true);
	const guildId = interaction.guildId!;

	try {
		if (menuId === 'all') {
			const guildData = await Guild.findOne({ guildId });

			if (!guildData || !guildData.reactionRolesMenus?.length) {
				return interaction.editReply('No reaction roles menus found in this server.');
			}

			const menusToToggle = guildData.reactionRolesMenus.filter((menu) => menu.active !== makeActive);
			if (menusToToggle.length === 0) {
				return interaction.editReply(
					makeActive ? 'All menus are already active.' : 'All menus are already paused.'
				);
			}

			const { updatedCount, failedCount } = await syncMenuMessageStates(
				interaction,
				menusToToggle,
				makeActive
			);

			await Guild.updateMany(
				{ guildId, 'reactionRolesMenus.active': !makeActive },
				{ $set: { 'reactionRolesMenus.$[].active': makeActive } }
			);

			let response = `Successfully ${makeActive ? 'resumed' : 'paused'} all reaction roles menus in the database.`;
			if (updatedCount > 0) {
				response += `\nUpdated ${updatedCount} menu message${updatedCount !== 1 ? 's' : ''}.`;
			}
			if (failedCount > 0) {
				response += `\n${failedCount} menu message${failedCount !== 1 ? 's' : ''} could not be updated (may have been deleted).`;
			}

			return interaction.editReply(response);
		}

		const guildData = await Guild.findOne({ guildId, 'reactionRolesMenus.messageId': menuId });
		if (!guildData) {
			return interaction.editReply('Reaction roles menu not found.');
		}

		const menu = guildData.reactionRolesMenus?.find((entry) => entry.messageId === menuId);
		if (!menu) {
			return interaction.editReply('Reaction roles menu not found.');
		}

		if (menu.active === makeActive) {
			return interaction.editReply(
				makeActive ? 'This menu is already active.' : 'This menu is already paused.'
			);
		}

		const updated = await updateMenuMessageState(interaction, menu, makeActive);

		await Guild.updateOne(
			{ guildId, 'reactionRolesMenus.messageId': menuId },
			{ $set: { 'reactionRolesMenus.$.active': makeActive } }
		);

		let response = `Successfully ${makeActive ? 'resumed' : 'paused'} reaction roles menu "${menu.title}" in the database.`;
		if (updated) {
			response += makeActive
				? '\nThe menu message has been updated and is now interactive.'
				: '\nThe menu message has been updated to reflect its paused state.';
		} else {
			response += '\nThe menu message could not be updated (it may have been deleted).';
		}

		return interaction.editReply(response);
	} catch (error) {
		container.logger.error(
			`Error ${makeActive ? 'resuming' : 'pausing'} reaction roles menu:`,
			error
		);
		return interaction.editReply(
			`An error occurred while ${makeActive ? 'resuming' : 'pausing'} the reaction roles menu.`
		);
	}
}

async function syncMenuMessageStates(
	interaction: ChatInputCommandInteraction,
	menus: ReactionRolesMenu[],
	isActive: boolean
): Promise<{ updatedCount: number; failedCount: number }> {
	let updatedCount = 0;
	let failedCount = 0;

	for (const menu of menus) {
		const updated = await updateMenuMessageState(interaction, menu, isActive);
		if (updated) {
			updatedCount++;
			continue;
		}

		failedCount++;
	}

	return { updatedCount, failedCount };
}

async function updateMenuMessageState(
	interaction: ChatInputCommandInteraction,
	menu: ReactionRolesMenu,
	isActive: boolean
): Promise<boolean> {
	return updateReactionRoleMenuMessage({
		interaction,
		channelId: menu.channelId,
		messageId: menu.messageId,
		title: menu.title,
		description: menu.description,
		roles: menu.roles,
		maxSelections: menu.maxSelections,
		isActive
	});
}
