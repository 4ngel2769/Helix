import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import { MessageFlags } from 'discord.js';
import { ModerationModule } from '../../modules/Moderation';
import { ModerationService } from '../../lib/services/ModerationService';
import { HybridModuleCommand } from '../../lib/structures/HybridCommand';
import { Guild } from '../../models/Guild';

@ApplyOptions<Command.Options>({
	name: 'warn',
	description: 'Manage moderation warning cases',
	aliases: ['warning'],
	preconditions: ['GuildOnly', 'ModeratorOnly']
})
export class WarnCommand extends HybridModuleCommand<ModerationModule> {
	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, {
			...options,
			module: 'Moderation',
			description: 'Manage moderation warning cases',
			enabled: true
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
			.addSubcommandGroup((group) =>
				group
					.setName('alias')
					.setDescription('Manage warning reason aliases')
					.addSubcommand((subcommand) =>
						subcommand
							.setName('set')
							.setDescription('Set or replace a warning reason alias')
							.addStringOption((option) => option.setName('alias').setDescription('Short alias').setRequired(true).setMaxLength(32))
							.addStringOption((option) => option.setName('reason').setDescription('Full warning reason').setRequired(true).setMaxLength(1000))
					)
					.addSubcommand((subcommand) =>
						subcommand
							.setName('remove')
							.setDescription('Remove a warning reason alias')
							.addStringOption((option) => option.setName('alias').setDescription('Alias to remove').setRequired(true).setMaxLength(32))
					)
					.addSubcommand((subcommand) => subcommand.setName('list').setDescription('List warning reason aliases'))
			)
			.addSubcommand((subcommand) =>
					subcommand
						.setName('add')
						.setDescription('Create a warning case')
						.addUserOption((option) => option.setName('user').setDescription('Member to warn').setRequired(true))
						.addStringOption((option) => option.setName('reason').setDescription('Reason for the warning').setMaxLength(1000).setRequired(true))
						.addBooleanOption((option) => option.setName('dm').setDescription('DM the member about the warning'))
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('list')
						.setDescription('List active warning cases')
						.addUserOption((option) => option.setName('user').setDescription('Member to inspect').setRequired(true))
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('clear')
						.setDescription('Clear a warning case')
						.addUserOption((option) => option.setName('user').setDescription('Member who received the warning').setRequired(true))
						.addStringOption((option) => option.setName('case_id').setDescription('Warning case ID').setRequired(true))
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('history')
						.setDescription('List all warning cases')
						.addUserOption((option) => option.setName('user').setDescription('Member to inspect').setRequired(true))
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		if (interaction.options.getSubcommandGroup(false) === 'alias') {
			return this.handleAlias(interaction);
		}
		const user = interaction.options.getUser('user', true);
		const guildId = interaction.guildId!;
		switch (interaction.options.getSubcommand()) {
			case 'add': {
				const result = await ModerationService.createWarning({
					guildId,
					userId: user.id,
					reason: interaction.options.getString('reason', true),
					moderatorId: interaction.user.id,
					moderatorTag: interaction.user.tag,
					source: 'manual',
					dm: interaction.options.getBoolean('dm') ?? undefined
				});
				const escalation = result.escalation ? ` Threshold action: ${result.escalation.action}.` : '';
				return interaction.reply({ content: `Warning created for <@${user.id}>. Active cases: ${result.activeCount}.${escalation}`, flags: MessageFlags.Ephemeral });
			}
			case 'list': {
				const warnings = await ModerationService.listWarnings(guildId, user.id, true);
				return interaction.reply({ content: warnings.length ? this.formatWarnings(warnings) : 'No active warning cases.', flags: MessageFlags.Ephemeral });
			}
			case 'clear': {
				const caseId = interaction.options.getString('case_id', true);
				const cleared = await ModerationService.clearWarning(guildId, user.id, caseId, interaction.user.id);
				return interaction.reply({ content: cleared ? `Cleared warning case \`${caseId}\`.` : 'Warning case was not found or already cleared.', flags: MessageFlags.Ephemeral });
			}
			case 'history': {
				const warnings = await ModerationService.listWarnings(guildId, user.id, false);
				return interaction.reply({ content: warnings.length ? this.formatWarnings(warnings) : 'No warning cases.', flags: MessageFlags.Ephemeral });
			}
			default:
				return interaction.reply({ content: 'Unknown warning subcommand.', flags: MessageFlags.Ephemeral });
		}
	}

	private async handleAlias(interaction: Command.ChatInputCommandInteraction): Promise<any> {
		const guildId = interaction.guildId!;
		const guildData = (await Guild.findOne({ guildId })) ?? new Guild({ guildId });
		guildData.warnSettings ??= { thresholds: [] };
		guildData.warnSettings.reasonAliases ??= {};
		const subcommand = interaction.options.getSubcommand();
		if (subcommand === 'set') {
			const alias = interaction.options.getString('alias', true).trim().toLowerCase();
			const reason = interaction.options.getString('reason', true).trim();
			if (!alias || !reason) return interaction.reply({ content: 'Alias and reason cannot be empty.', flags: MessageFlags.Ephemeral });
			guildData.warnSettings.reasonAliases[alias] = reason;
			await guildData.save();
			return interaction.reply({ content: `Warning alias \`${alias}\` saved.`, flags: MessageFlags.Ephemeral });
		}
		if (subcommand === 'remove') {
			const alias = interaction.options.getString('alias', true).trim().toLowerCase();
			const removed = guildData.warnSettings.reasonAliases[alias];
			if (!removed) return interaction.reply({ content: 'Alias not found.', flags: MessageFlags.Ephemeral });
			delete guildData.warnSettings.reasonAliases[alias];
			await guildData.save();
			return interaction.reply({ content: `Warning alias \`${alias}\` removed.`, flags: MessageFlags.Ephemeral });
		}
		const aliases = Object.entries(guildData.warnSettings.reasonAliases);
		return interaction.reply({ content: aliases.length ? aliases.map(([alias, reason]) => `\`${alias}\` → ${reason}`).join('\n').slice(0, 2000) : 'No warning aliases configured.', flags: MessageFlags.Ephemeral });
	}

	private formatWarnings(warnings: Array<{ _id?: string; reason: string; timestamp: Date; active: boolean }>): string {
		return warnings.map((warning) => `${warning.active ? '●' : '○'} \`${warning._id ?? 'unknown'}\` — ${warning.reason} (${warning.timestamp.toISOString()})`).join('\n').slice(0, 2000);
	}
}
