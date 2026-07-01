import { container } from '@sapphire/framework';
import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { Guild, type ReactionRole } from '../../../models/Guild';
import { parseReactionRoleEmoji, updateReactionRoleMenuMessage } from '../../../lib/utils/reactionRolesHelpers';

export async function handleEdit(interaction: ChatInputCommandInteraction) {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const messageId = interaction.options.getString('menu_id', true);
	const newTitle = interaction.options.getString('title');
	const newDescription = interaction.options.getString('description');
	const addRole = interaction.options.getRole('add_role');
	const addLabel = interaction.options.getString('add_label');
	const addEmoji = interaction.options.getString('add_emoji');
	const removeRolesInput = interaction.options.getString('remove_roles');
	const newMaxSelections = interaction.options.getInteger('max_selections');

	const guildId = interaction.guildId!;

	try {
		const guildData = await Guild.findOne({ guildId, 'reactionRolesMenus.messageId': messageId });

		if (!guildData) {
			return interaction.editReply('Reaction roles menu not found.');
		}

		const menuIndex = guildData.reactionRolesMenus?.findIndex(m => m.messageId === messageId);

		if (menuIndex === undefined || menuIndex === -1 || !guildData.reactionRolesMenus) {
			return interaction.editReply('Reaction roles menu not found.');
		}

		const menu = guildData.reactionRolesMenus[menuIndex];

		const updateData: Record<string, string | number | ReactionRole[]> = {};
		const changes: string[] = [];

		let updatedRoles: ReactionRole[] = [...menu.roles];
		let rolesChanged = false;

		if (newTitle) {
			updateData['reactionRolesMenus.$.title'] = newTitle;
			changes.push(`> title: \`${menu.title}\` -> \`${newTitle}\``);
		}

		if (newDescription) {
			updateData['reactionRolesMenus.$.description'] = newDescription;
			changes.push(`> description: \`${menu.description.substring(0, 30)}${menu.description.length > 30 ? '...' : ''}\` -> \`${newDescription.substring(0, 30)}${newDescription.length > 30 ? '...' : ''}\``);
		}

		if (newMaxSelections !== null && newMaxSelections !== undefined) {
			updateData['reactionRolesMenus.$.maxSelections'] = newMaxSelections;
			changes.push(`> max selections: \`${menu.maxSelections > 0 ? menu.maxSelections : 'Unlimited'}\` -> \`${newMaxSelections > 0 ? newMaxSelections : 'Unlimited'}\``);
		}

		if (addRole && addLabel) {
			const botMember = interaction.guild?.members.me;
			if (!botMember) {
				return interaction.editReply('An error occurred. Please try again later.');
			}

			if (addRole.managed) {
				return interaction.editReply(`The role "${addRole.name}" is managed by an integration and cannot be assigned by me.`);
			}

			const guildRole = interaction.guild?.roles.cache.get(addRole.id);
			if (!guildRole || botMember.roles.highest.comparePositionTo(guildRole) <= 0) {
				return interaction.editReply(`My highest role must be above the "${addRole.name}" role in the server settings.`);
			}

			if (!updatedRoles.some(r => r.roleId === addRole.id)) {
				updatedRoles.push({
					roleId: addRole.id,
					label: addLabel,
					description: '',
					emoji: addEmoji || undefined
				});
				rolesChanged = true;
				changes.push(`> added role: \`${addRole.name}\` (${addLabel})`);
			} else {
				return interaction.editReply(`Role "${addRole.name}" already exists in this menu.`);
			}
		} else if ((addRole && !addLabel) || (!addRole && addLabel)) {
			return interaction.editReply('Both a role and label are required to add a new role.');
		}

		const updateEmojiRoleId = interaction.options.getString('update_emoji_role');
		const updateEmoji = interaction.options.getString('update_emoji');

		if (addRole && addLabel) {
			if (addEmoji) {
				const emoji = parseReactionRoleEmoji(addEmoji);
				if (emoji) {
					updatedRoles[updatedRoles.length - 1].emoji = emoji;
				}
			}
		}

		if (updateEmojiRoleId && updateEmoji) {
			const roleIndex = updatedRoles.findIndex(r => r.roleId === updateEmojiRoleId);
			if (roleIndex === -1) {
				return interaction.editReply(`Could not find role with ID ${updateEmojiRoleId} in this menu.`);
			}

			const emoji = parseReactionRoleEmoji(updateEmoji);
			if (emoji) {
				updatedRoles[roleIndex].emoji = emoji;
				rolesChanged = true;

				const roleName = interaction.guild?.roles.cache.get(updateEmojiRoleId)?.name || 'Unknown';
				changes.push(`> updated emoji for role: \`${roleName}\` (${updatedRoles[roleIndex].label})`);
			}
		}

		if (removeRolesInput) {
			const roleIdsToRemove = removeRolesInput.split(',').map(id => id.trim());

			if (roleIdsToRemove.length > 0) {
				const initialRoleCount = updatedRoles.length;
				updatedRoles = updatedRoles.filter(r => !roleIdsToRemove.includes(r.roleId));

				if (updatedRoles.length < initialRoleCount) {
					rolesChanged = true;

					const removedRoles = roleIdsToRemove.map(roleId => {
						const roleInfo = menu.roles.find(r => r.roleId === roleId);
						const roleName = interaction.guild?.roles.cache.get(roleId)?.name || 'Unknown';
						return roleInfo ? `\`${roleName}\` (${roleInfo.label})` : `\`${roleId}\``;
					});

					changes.push(`> removed roles: ${removedRoles.join(', ')}`);
				}

				if (updatedRoles.length === 0) {
					return interaction.editReply('Cannot remove all roles. A menu must have at least one role.');
				}
			}
		}

		if (rolesChanged) {
			updateData['reactionRolesMenus.$.roles'] = updatedRoles;
		}

		if (Object.keys(updateData).length === 0) {
			return interaction.editReply('No changes were specified.');
		}

		await Guild.updateOne(
			{ guildId, 'reactionRolesMenus.messageId': messageId },
			{ $set: updateData }
		);

		try {
			const updated = await updateReactionRoleMenuMessage({
				interaction,
				channelId: menu.channelId,
				messageId: menu.messageId,
				title: newTitle || menu.title,
				description: newDescription || menu.description,
				roles: rolesChanged ? updatedRoles : menu.roles,
				maxSelections:
					newMaxSelections !== null && newMaxSelections !== undefined ? newMaxSelections : menu.maxSelections,
				isActive: menu.active
			});

			if (!updated) {
				return interaction.editReply(`Menu updated in database, but couldn't update the message. It might have been deleted.`);
			}
		} catch (error) {
			container.logger.error('Error updating message:', error);
			return interaction.editReply(`Menu updated in database, but couldn't update the message. It might have been deleted.`);
		}

		return interaction.editReply(`Successfully updated reaction roles menu "${newTitle || menu.title}".\nChanges: ${changes.join(', ')}`);

	} catch (error) {
		container.logger.error('Error editing reaction roles menu:', error);
		return interaction.editReply('An error occurred while editing the reaction roles menu.');
	}
}
