import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ChannelType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { ChannelLockService } from '../../lib/services/ChannelLockService';

import { HybridModuleCommand } from '../../lib/structures/HybridCommand';

/** "10m", "1h", "30s" -> ms. Returns 0 for anything unparseable. */
export function parseDuration(input: string | null): number {
	if (!input) return 0;
	const match = input.trim().match(/^(\d+)\s*(s|sec|secs|m|min|mins|h|hr|hrs)?$/i);
	if (!match) return 0;
	const n = parseInt(match[1]!, 10);
	const unit = (match[2] ?? 'm').toLowerCase();
	return unit.startsWith('s') ? n * 1000 : unit.startsWith('h') ? n * 3_600_000 : n * 60_000;
}

@ApplyOptions<Command.Options>({ name: 'lock', description: 'Lock a channel', preconditions: ['GuildOnly'] })
export class LockCommand extends HybridModuleCommand<ModerationModule> {
	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, { ...options, module: 'Moderation', description: 'Lock a channel', enabled: true });
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('lock')
				.setDescription('Lock a channel')
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
				.addChannelOption((option) => option.setName('channel').setDescription('The channel to lock').addChannelTypes(ChannelType.GuildText, ChannelType.GuildForum).setRequired(true))
				.addStringOption((option) => option.setName('reason').setDescription('Reason for locking the channel').setRequired(false))
				.addStringOption((option) => option.setName('time').setDescription('Auto-unlock after (e.g. 10m, 1h, 30s). Default unit is minutes.').setRequired(false))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const guild = interaction.guild;
		if (!guild) return interaction.reply({ content: 'This only works in a server.', flags: MessageFlags.Ephemeral });
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
			return interaction.reply({ content: 'You need Manage Channels and Manage Roles.', flags: MessageFlags.Ephemeral });
		}

		const channel = interaction.options.getChannel('channel', true);
		if (!channel || !('permissionOverwrites' in channel)) {
			return interaction.reply({ content: 'That channel cannot be locked.', flags: MessageFlags.Ephemeral });
		}
		const reason = interaction.options.getString('reason') ?? 'No reason provided';
		const timeInput = interaction.options.getString('time');
		const durationMs = parseDuration(timeInput);
		if (timeInput && durationMs === 0) {
			return interaction.reply({ content: 'Could not read that duration. Try `30m`, `2h` or `8h`.', flags: MessageFlags.Ephemeral });
		}

		try {
			const result = await ChannelLockService.lock(guild, channel, {
				by: interaction.user.id,
				byTag: interaction.user.tag,
				reason,
				durationMs: durationMs || undefined
			});
			if (!result.ok) return interaction.reply({ content: `Could not lock that channel${result.skipped ? `: ${result.skipped}` : ''}.`, flags: MessageFlags.Ephemeral });
			return interaction.reply({
				content: `Locked ${channel}${durationMs ? ` — auto-unlocking in <t:${Math.floor((Date.now() + durationMs) / 1000)}:R>` : ''}. Reason: ${reason}`
			});
		} catch (error) {
			this.container.logger.error('Error locking channel:', error);
			return interaction.reply({ content: 'Failed to lock the channel. Check my permissions and try again.', flags: MessageFlags.Ephemeral });
		}
	}
}
