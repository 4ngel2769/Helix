import { container } from '@sapphire/framework';
import {
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ChatInputCommandInteraction,
  type ColorResolvable,
  type TextChannel
} from 'discord.js';
import { Guild, type ReactionRole } from '../../../models/Guild';
import config from '../../../config';
import { ErrorHandler } from '../../../lib/structures/ErrorHandler';
import { parseReactionRoleEmoji } from '../../../lib/utils/reactionRolesHelpers';

export async function handleCreate(interaction: ChatInputCommandInteraction) {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const channel = interaction.options.getChannel('channel', true) as TextChannel;
	const title = interaction.options.getString('title', true);
	const description = interaction.options.getString('description', true);
	const maxSelections = interaction.options.getInteger('max_selections') ?? 0;

	const hasPermissions = await ErrorHandler.checkPermissions(channel, [
		'SendMessages',
		'ViewChannel',
		'EmbedLinks'
	]);

	if (!hasPermissions) {
		return interaction.editReply('I need permission to send messages and embeds in the target channel.');
	}

	const botMember = interaction.guild?.members.me;
	if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
		return interaction.editReply('I need the Manage Roles permission to create reaction roles.');
	}

	const roles: ReactionRole[] = [];
	for (let i = 1; i <= 5; i++) {
		const role = interaction.options.getRole(`role${i}`);
		const label = interaction.options.getString(`label${i}`);
		const emojiInput = interaction.options.getString(`emoji${i}`);

		if (role && label) {
			if (role.managed) {
				return interaction.editReply(`The role "${role.name}" is managed by an integration and cannot be assigned by me.`);
			}

			const guildRole = interaction.guild?.roles.cache.get(role.id);
			if (guildRole && botMember.roles.highest.comparePositionTo(guildRole) <= 0) {
				return interaction.editReply(`My highest role must be above the "${role.name}" role in the server settings.`);
			}

			const emoji = parseReactionRoleEmoji(emojiInput);

			roles.push({
				roleId: role.id,
				label: label,
				description: '',
				emoji: emoji
			});
		}
	}

	if (roles.length === 0) {
		return interaction.editReply('You need to provide at least one role and label.');
	}

	try {
		const embed = new EmbedBuilder()
			.setColor(config.bot.embedColor.default as ColorResolvable)
			.setTitle(title)
			.setDescription(description)
			.setFooter({ text: `Select roles from the dropdown menu below` });

		const options = roles.map(role => {
			const option = new StringSelectMenuOptionBuilder()
				.setLabel(role.label)
				.setValue(role.roleId)
				.setDescription(`Get the ${interaction.guild?.roles.cache.get(role.roleId)?.name || 'Unknown'} role`);

			if (role.emoji) {
				const discordEmojiRegex = /<(a)?:(\w+):(\d+)>/;
				const match = role.emoji.match(discordEmojiRegex);

				if (match) {
					const name = match[2];
					const id = match[3];
					option.setEmoji({ name, id });
				} else {
					option.setEmoji({ name: role.emoji });
				}
			}

			return option;
		});

		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('reaction-roles-select')
			.setPlaceholder('Select roles...')
			.addOptions(options)
			.setDisabled(false)
			.setMinValues(0)
			.setMaxValues(maxSelections > 0 ? Math.min(maxSelections, roles.length) : roles.length);

		const row = new ActionRowBuilder<StringSelectMenuBuilder>()
			.addComponents(selectMenu);

		const sentMessage = await channel.send({
			embeds: [embed],
			components: [row]
		});

		const guildId = interaction.guildId!;
		await Guild.updateOne(
			{ guildId },
			{
				$push: {
					reactionRolesMenus: {
						messageId: sentMessage.id,
						channelId: channel.id,
						title,
						description,
						roles,
						maxSelections,
						active: true,
						createdBy: interaction.user.id,
						createdAt: new Date()
					}
				}
			},
			{ upsert: true }
		);

		return interaction.editReply(`Successfully created role selection menu in ${channel}.`);

	} catch (error) {
		container.logger.error('Error creating reaction roles menu:', error);
		return interaction.editReply('An error occurred while creating the roles menu.');
	}
}
