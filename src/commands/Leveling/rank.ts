import { ModuleCommand } from '@kbotdev/plugin-modules';
import { LevelingModule } from '../../modules/Leveling';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags, type ColorResolvable } from 'discord.js';
import { GuildXp } from '../../models/GuildXp';
import { levelForXp, progressBar, progressToNext } from '../../lib/utils/leveling';
import config from '../../config';

import { HybridModuleCommand } from '../../lib/structures/HybridCommand';

@ApplyOptions<Command.Options>({
	name: 'rank',
	description: 'View your (or another member\'s) XP rank in this server.',
	fullCategory: ['Leveling'],
	enabled: true
})
export class RankCommand extends HybridModuleCommand<LevelingModule> {
	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, {
			...options,
			module: 'Leveling',
			description: 'rank command',
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
				.addUserOption((option) => option.setName('user').setDescription('Whose rank to view').setRequired(false))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
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
}
