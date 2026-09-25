import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';
import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { GuildMember, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { renderMessageTemplate } from '../../lib/utils/messagePlaceholders';
import { helixEmbed, brandColor } from '../../lib/embeds/build';
import { getGuildStrings } from '../../lib/i18n/guildStrings';
import { t } from '../../lib/i18n';
import { Guild } from '../../models/Guild';
import { sendLog, suppressNext } from '../../lib/logging/logService';

import { HybridModuleCommand } from '../../lib/structures/HybridCommand';

@ApplyOptions<ModuleCommand.Options>({
	name: 'ban',
	module: 'Moderation',
	description: 'Ban a member from the server',
	requiredUserPermissions: ['BanMembers'],
	requiredClientPermissions: ['BanMembers'],
	enabled: true
})
export class BanCommand extends HybridModuleCommand<ModerationModule> {
	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, {
			...options,
			description: 'Ban a member from the server',
			requiredUserPermissions: ['BanMembers'],
			requiredClientPermissions: ['BanMembers'],
			enabled: true
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('ban')
				.setDescription('Ban a member from the server')
				.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
				.addUserOption((option) => option.setName('target').setDescription('The member to ban').setRequired(true))
				.addStringOption((option) => option.setName('reason').setDescription('The reason for the ban').setRequired(false))
				.addNumberOption((option) =>
					option
						.setName('days')
						.setDescription('Number of days of messages to delete (0-7)')
						.setMinValue(0)
						.setMaxValue(7)
						.setRequired(false)
				)
				.addStringOption((option) => option.setName('message').setDescription('Custom message to send on ban').setRequired(false))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const target = interaction.options.getMember('target') as GuildMember;
		const strings = await getGuildStrings(interaction.guildId);
		const reason = interaction.options.getString('reason') || t('common.noReason', strings);
		const days = interaction.options.getNumber('days') || 0;

		if (!target) {
			return interaction.reply({ content: t('error.user.notFound', strings), flags: MessageFlags.Ephemeral });
		}

		if (!target.bannable) {
			return interaction.reply({ content: t('error.bot.cannotBan', strings), flags: MessageFlags.Ephemeral });
		}

		const customMessage = interaction.options.getString('message');
		const vars = {
			'user.id': target.id,
			'user.mention': `<@${target.id}>`,
			'user.name': target.displayName,
			'user.tag': target.user.username,
			'target.id': target.id,
			'target.mention': `<@${target.id}>`,
			'target.name': target.displayName,
			'target.tag': target.user.username,
			'mod.id': interaction.user.id,
			'mod.mention': `<@${interaction.user.id}>`,
			'mod.name': interaction.member instanceof GuildMember ? interaction.member.displayName : interaction.user.username,
			'mod.tag': interaction.user.username,
			reason
		};

		try {
			const guildData = interaction.guildId ? await Guild.findOne({ guildId: interaction.guildId }).lean() : null;
			// A guild-authored `banMessage` (or the per-invocation option) still
			// wins verbatim; otherwise the localized catalog speaks.
			let customText: string | null = null;
			if (guildData?.banMessage) {
				customText = renderMessageTemplate(guildData.banMessage, {
					userMention: `<@${target.id}>`,
					userName: target.displayName,
					userTag: target.user.username,
					prefix: guildData?.prefix ?? this.container.client.options.defaultPrefix?.toString() ?? 'x',
					serverName: interaction.guild?.name ?? '',
					serverMembers: interaction.guild?.memberCount ?? 0
				});
			} else if (customMessage) {
				// Legacy per-invocation override: still `$user` / `$mod`.
				customText = customMessage.replace(/\$user/g, target.user.tag).replace(/\$mod/g, interaction.user.tag);
			}

			await target.ban({ deleteMessageDays: days, reason });

			if (interaction.guild) {
				suppressNext(interaction.guild.id, 'mod.ban', target.id);
				suppressNext(interaction.guild.id, 'member.leave', target.id);
				void sendLog(interaction.guild, 'mod.ban', {
					description: t('mod.ban.description', strings, vars),
					fields: [{ name: t('mod.ban.field.reason', strings), value: reason.slice(0, 1024) }],
					actorId: interaction.user.id,
					targetId: target.id,
					isBot: target.user.bot
				});
			}

			return interaction.reply({
				embeds: [
					await helixEmbed(interaction.guildId, {
						key: 'mod.ban',
						color: brandColor(interaction.guildId, 'err'),
						description: customText ?? undefined,
						vars,
						fields: [
							{ nameKey: 'mod.ban.field.reason', value: reason },
							{ nameKey: 'mod.ban.field.days', value: String(days) }
						]
					})
				],
				flags: MessageFlags.Ephemeral
			});
		} catch (error) {
			container.logger.error('ban failed:', error);
			return interaction.reply({ content: t('mod.ban.failed', strings), flags: MessageFlags.Ephemeral });
		}
	}
}
