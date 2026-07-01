import {
  EmbedBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
  type ColorResolvable
} from 'discord.js';
import { Guild } from '../../../models/Guild';
import config from '../../../config';

export async function handleList(interaction: ChatInputCommandInteraction) {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const guildId = interaction.guildId!;
	const guildData = await Guild.findOne({ guildId });

	if (!guildData || !guildData.reactionRolesMenus?.length) {
		return interaction.editReply('No reaction roles menus found in this server.');
	}

	const embed = new EmbedBuilder()
		.setColor(config.bot.embedColor.default as ColorResolvable)
		.setTitle('Reaction Roles Menus')
		.setDescription(`This server has ${guildData.reactionRolesMenus.length} reaction roles menus.`)
		.setFooter({ text: `Requested by ${interaction.user.tag}` });

	for (const menu of guildData.reactionRolesMenus) {
		const channel = interaction.guild?.channels.cache.get(menu.channelId);
		const roles = menu.roles.map(role => {
			const roleObj = interaction.guild?.roles.cache.get(role.roleId);
			return roleObj
				? `<@&${role.roleId}> (${role.label})`
				: `Unknown Role: ${role.label}`;
		}).join('\n');

		embed.addFields({
			name: `${menu.active ? '✅' : '❌'} ${menu.title} (${menu.messageId})`,
			value: `**Channel:** ${channel ? `<#${channel.id}>` : 'Unknown'}\n**Roles:** \n${roles}\n**Max Selections:** ${menu.maxSelections > 0 ? menu.maxSelections : 'Unlimited'}`,
			inline: false
		});
	}

	return interaction.editReply({ embeds: [embed] });
}
