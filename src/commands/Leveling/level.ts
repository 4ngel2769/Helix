import { ModuleCommand } from '@kbotdev/plugin-modules';
import { LevelingModule } from '../../modules/Leveling';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { getGuildAutomation } from '../../lib/utils/guildAutomationCache';
import { adjustXp, syncRoleRewards } from '../../lib/utils/leveling';
import { emptyLeaderboardMessage, fetchRank, fetchTop, leaderboardEmbed, rankPayload } from '../../lib/utils/levelingEmbeds';

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
				.addSubcommand((subcommand) => subcommand.setName('give-xp').setDescription('Give XP to a member (Manage Server).').addUserOption((o) => o.setName('user').setDescription('Member to give XP to').setRequired(true)).addIntegerOption((o) => o.setName('amount').setDescription('XP amount').setMinValue(1).setMaxValue(1_000_000).setRequired(true)))
				.addSubcommand((subcommand) => subcommand.setName('remove-xp').setDescription('Remove XP from a member (Manage Server).').addUserOption((o) => o.setName('user').setDescription('Member to remove XP from').setRequired(true)).addIntegerOption((o) => o.setName('amount').setDescription('XP amount').setMinValue(1).setMaxValue(1_000_000).setRequired(true)))
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
		if (subcommand === 'give-xp' || subcommand === 'remove-xp') return this.runAdjust(interaction, subcommand === 'give-xp');

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
			return interaction.reply(await rankPayload(interaction.guild, await fetchRank(interaction.guildId, target)));
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
			const top = await fetchTop(interaction.guildId);
			if (top.length === 0) {
				const auto = await getGuildAutomation(interaction.guildId).catch(() => null);
				return interaction.reply({ content: emptyLeaderboardMessage(auto?.levelingModuleOn === true), flags: MessageFlags.Ephemeral });
			}
			return interaction.reply({ embeds: [leaderboardEmbed(interaction.guild, top)] });
		} catch (error) {
			this.container.logger.error('Error fetching leaderboard:', error);
			return interaction.reply({ content: 'Could not load the leaderboard right now.', flags: MessageFlags.Ephemeral });
		}
	}

	private async runAdjust(interaction: Command.ChatInputCommandInteraction, grant: boolean) {
		if (!interaction.guildId) return interaction.reply({ content: 'This only works inside a server.', flags: MessageFlags.Ephemeral });
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
			return interaction.reply({ content: 'You need the Manage Server permission to change other members\' XP.', flags: MessageFlags.Ephemeral });
		}
		const target = interaction.options.getUser('user', true);
		const amount = interaction.options.getInteger('amount', true);
		try {
			const res = await adjustXp(interaction.guildId, target.id, grant ? amount : -amount);
			if (!res) return interaction.reply({ content: 'Nothing to change.', flags: MessageFlags.Ephemeral });

			// Reward roles follow the member's level in both directions.
			let rolesChanged = 0;
			const member = interaction.guild?.members.cache.get(target.id);
			const lv = (await getGuildAutomation(interaction.guildId).catch(() => null))?.leveling;
			if (member && lv?.roleRewards?.length) {
				rolesChanged = (await syncRoleRewards(member, res.level, lv).catch(() => [])).length;
			}

			const roleNote = rolesChanged ? ` ${rolesChanged} reward role${rolesChanged === 1 ? '' : 's'} updated.` : '';
			return interaction.reply({
				content: `${grant ? 'Gave' : 'Removed'} **${amount.toLocaleString('en-US')}** XP ${grant ? 'to' : 'from'} <@${target.id}> — they now have **${res.xp.toLocaleString('en-US')}** XP (level **${res.level}**).${roleNote}`,
				flags: MessageFlags.Ephemeral
			});
		} catch (error) {
			this.container.logger.error('Error adjusting XP:', error);
			return interaction.reply({ content: 'Could not change XP right now.', flags: MessageFlags.Ephemeral });
		}
	}
}
