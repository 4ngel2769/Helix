import { ModuleCommand } from '@kbotdev/plugin-modules';
import { LevelingModule } from '../../modules/Leveling';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';

import { HybridModuleCommand } from '../../lib/structures/HybridCommand';
import { fetchRank, rankPayload } from '../../lib/utils/levelingEmbeds';

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
			return interaction.reply(await rankPayload(interaction.guild, await fetchRank(interaction.guildId, target)));
		} catch (error) {
			this.container.logger.error('Error fetching rank:', error);
			return interaction.reply({ content: 'Could not load rank right now.', flags: MessageFlags.Ephemeral });
		}
	}
}
