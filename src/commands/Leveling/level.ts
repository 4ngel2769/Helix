import { ModuleCommand } from '@kbotdev/plugin-modules';
import { LevelingModule } from '../../modules/Leveling';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags, type ColorResolvable } from 'discord.js';
import { GuildXp } from '../../models/GuildXp';
import { levelForXp, progressBar, progressToNext } from '../../lib/utils/leveling';
import { getGuildAutomation } from '../../lib/utils/guildAutomationCache';
import config from '../../config';

import { HybridModuleCommand } from '../../lib/structures/HybridCommand';
import { commandHelpEmbed } from '../../lib/utils/commandHelp';

@ApplyOptions<Command.Options>({
	name: 'level',
	description: 'View leveling information.',
	fullCategory: ['Leveling'],
	enabled: true
})
export class LevelCommand extends HybridModuleCommand<LevelingModule> {
	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, {
			...options,
			module: 'Leveling',
			description: 'level command',
			enabled: true,
			nsfw: false,
			preconditions: ['ModuleEnabled']
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setIntegrationTypes(0, 1)
				.setContexts(0, 1, 2)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('rank')
						.setDescription("View your (or another member's) XP rank in this server.")
						.addUserOption((option) => option.setName('user').setDescription('Whose rank to view').setRequired(false))
				)
				.addSubcommand((subcommand) => subcommand.setName('leaderboard').setDescription('Top 10 most active members by XP in this server.'))
				.addSubcommand((subcommand) => subcommand.setName('help').setDescription('Show the leveling options and usage'))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const subcommand = interaction.options.getSubcommand();
		if (subcommand === 'help') {
			return interaction.reply({
				embeds: [commandHelpEmbed(this, 'View XP ranks and the server leveling leaderboard.')],
				flags: MessageFlags.Ephemeral
			});
		}

		switch (subcommand) {
			case 'rank':
				return this.runRank(interaction);
			case 'leaderboard':
				return this.runLeaderboard(interaction);
			default:
				return interaction.reply({ content: 'Invalid level subcommand.', flags: MessageFlags.Ephemeral });
		}
	}

	private async runRank(interaction: Command.ChatInputCommandInteraction) {
		const target = interaction.options.getUser('user') ?? interaction.user;
		if (!interaction.guildId) {
			return interaction.reply({ content: 'Rank only works inside a server.', flags: MessageFlags.Ephemeral });
		}
		try {
			const doc = await GuildXp.findOne({ guildId: interaction.guildId, userId: target.id }).lean();
			const xp = doc?.xp ?? 0;
			const { level, into, needed } = progressToNext(xp);
			const rank = (await GuildXp.countDocuments({ guildId: interaction.guildId, xp: { $gt: xp } })) + 1;
			const embed = new EmbedBuilder()
				.setColor(config.bot.embedColor.default as ColorResolvable)
				.setTitle(`${target.username}'s rank`)
				.setThumbnail(target.displayAvatarURL())
				.addFields(
					{ name: 'Level', value: String(level), inline: true },
					{ name: 'Server rank', value: `#${rank}`, inline: true },
					{ name: 'Progress', value: `${progressBar(into, needed)} ${into}/${needed} XP`, inline: false }
				)
				.setFooter({ text: `${xp.toLocaleString('en-US')} total XP` });
			return interaction.reply({ embeds: [embed] });
		} catch (error) {
			this.container.logger.error('Error fetching rank:', error);
			return interaction.reply({ content: 'Could not load rank right now.', flags: MessageFlags.Ephemeral });
		}
	}

	private async runLeaderboard(interaction: Command.ChatInputCommandInteraction) {
		if (!interaction.guildId) {
			return interaction.reply({ content: 'Leaderboard only works inside a server.', flags: MessageFlags.Ephemeral });
		}
		try {
			const top = await GuildXp.find({ guildId: interaction.guildId }).sort({ xp: -1 }).limit(10).lean();
			if (top.length === 0) {
				const auto = await getGuildAutomation(interaction.guildId).catch(() => null);
				if (!auto?.levelingModuleOn) {
					return interaction.reply({
						content:
							'Leveling is not switched on here yet â€” enable the Leveling module (dashboard Modules page or /configmodule), then start chatting!',
						flags: MessageFlags.Ephemeral
					});
				}
				return interaction.reply({ content: 'Nobody has earned XP here yet â€” start chatting!', flags: MessageFlags.Ephemeral });
			}
			const medals = ['ðŸ¥‡', 'ðŸ¥ˆ', 'ðŸ¥‰'];
			const lines = top.map((row, i) => {
				const prefix = medals[i] ?? `**${i + 1}.**`;
				return `${prefix} <@${row.userId}> â€” level ${levelForXp(row.xp)} (${row.xp.toLocaleString('en-US')} XP)`;
			});
			const embed = new EmbedBuilder()
				.setColor(config.bot.embedColor.default as ColorResolvable)
				.setTitle(`ðŸ† ${interaction.guild?.name ?? 'Server'} leaderboard`)
				.setDescription(lines.join('\n'));
			return interaction.reply({ embeds: [embed] });
		} catch (error) {
			this.container.logger.error('Error fetching leaderboard:', error);
			return interaction.reply({ content: 'Could not load the leaderboard right now.', flags: MessageFlags.Ephemeral });
		}
	}
}
