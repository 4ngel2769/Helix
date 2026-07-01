import { container } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord.js';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import { Guild } from '../../../models/Guild';

export async function respondWithMenuIdChoices(
	interaction: AutocompleteInteraction,
	includeAllOption: boolean
) {
	try {
		const guildId = interaction.guildId!;
		const guildData = await Guild.findOne({ guildId });

		if (!guildData || !guildData.reactionRolesMenus?.length) {
			return interaction.respond([]);
		}

		const allChoice = includeAllOption ? [{ name: 'All menus', value: 'all' }] : [];
		const menuChoices = guildData.reactionRolesMenus.map((menu) => ({
			name: `${menu.title} (${menu.messageId})`,
			value: menu.messageId
		}));

		return interaction.respond([...allChoice, ...menuChoices]);
	} catch (error) {
		container.logger.error('Error in menu_id autocomplete:', error);
		return interaction.respond([]);
	}
}

export async function respondWithMenuRoleChoices(
	interaction: AutocompleteInteraction,
	includeEmojiStatus: boolean
) {
	try {
		const menuId = interaction.options.getString('menu_id');
		if (!menuId) {
			return interaction.respond([{ name: 'Please select a menu ID first', value: '' }]);
		}

		const guildId = interaction.guildId!;
		const guildData = await Guild.findOne({
			guildId,
			'reactionRolesMenus.messageId': menuId
		});

		const menu = guildData?.reactionRolesMenus?.find((entry) => entry.messageId === menuId);
		if (!menu || !menu.roles.length) {
			return interaction.respond([]);
		}

		const choices = menu.roles.map((roleData) => {
			const role = interaction.guild?.roles.cache.get(roleData.roleId);
			const roleName = role ? role.name : 'Unknown Role';
			const emojiPrefix = includeEmojiStatus ? `${roleData.emoji ? '✓' : '✗'} ` : '';

			return {
				name: `${emojiPrefix}${roleData.label} (${roleName})`,
				value: roleData.roleId
			};
		});

		return interaction.respond(choices);
	} catch (error) {
		container.logger.error('Error in role autocomplete:', error);
		return interaction.respond([]);
	}
}

export async function hasRequiredPermissions(interaction: ChatInputCommandInteraction): Promise<boolean> {
	if (interaction.guild?.ownerId === interaction.user.id) {
		return true;
	}

	if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
		return true;
	}

	if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
		return true;
	}

	const member = interaction.member;
	if (member && 'roles' in member) {
		const guildId = interaction.guildId!;
		const guildData = await Guild.findOne({ guildId });

		if (guildData?.adminRoleId && 'cache' in member.roles && member.roles.cache.has(guildData.adminRoleId)) {
			return true;
		}
	}

	return false;
}
