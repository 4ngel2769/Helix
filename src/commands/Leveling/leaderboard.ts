import { ModuleCommand } from '@kbotdev/plugin-modules';
import { LevelingModule } from '../../modules/Leveling';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags, type ColorResolvable } from 'discord.js';
import { GuildXp } from '../../models/GuildXp';
import { levelForXp } from '../../lib/utils/leveling';
import config from '../../config';

@ApplyOptions<Command.Options>({
	name: 'leaderboard',
	description: 'Top 10 most active members by XP in this server.',
	fullCategory: ['Leveling'],
	enabled: true
})
export class LeaderboardCommand extends ModuleCommand<LevelingModule> {
	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, {
			...options,
			module: 'Leveling',
			description: 'leaderboard command',
			enabled: true,
			nsfw: false,
			preconditions: ['ModuleEnabled']
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder.setName(this.name).setDescription(this.description).setIntegrationTypes(0, 1).setContexts(0, 1, 2)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		if (!interaction.guildId) {
			return interaction.reply({ content: 'Leaderboard only works inside a server.', flags: MessageFlags.Ephemeral });
		}
		try {
			const top = await GuildXp.find({ guildId: interaction.guildId }).sort({ xp: -1 }).limit(10).lean();
			if (top.length === 0) {
				return interaction.reply({ content: 'Nobody has earned XP here yet — start chatting!', flags: MessageFlags.Ephemeral });
			}
			const medals = ['🥇', '🥈', '🥉'];
			const lines = top.map((row, i) => {
				const prefix = medals[i] ?? `**${i + 1}.**`;
				return `${prefix} <@${row.userId}> — level ${levelForXp(row.xp)} (${row.xp.toLocaleString('en-US')} XP)`;
			});
			const embed = new EmbedBuilder()
				.setColor(config.bot.embedColor.default as ColorResolvable)
				.setTitle(`🏆 ${interaction.guild?.name ?? 'Server'} leaderboard`)
				.setDescription(lines.join('\n'));
			return interaction.reply({ embeds: [embed] });
		} catch (error) {
			this.container.logger.error('Error fetching leaderboard:', error);
			return interaction.reply({ content: 'Could not load the leaderboard right now.', flags: MessageFlags.Ephemeral });
		}
	}
}
