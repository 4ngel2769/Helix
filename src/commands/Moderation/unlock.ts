import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ChannelType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { ChannelLockService } from '../../lib/services/ChannelLockService';

import { HybridModuleCommand } from '../../lib/structures/HybridCommand';

@ApplyOptions<Command.Options>({ name: 'unlock', description: 'Unlock a channel', preconditions: ['GuildOnly'] })
export class UnlockCommand extends HybridModuleCommand<ModerationModule> {
	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, { ...options, module: 'Moderation', description: 'Unlock a channel', enabled: true });
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('unlock')
				.setDescription('Unlock a channel')
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
				.addChannelOption((option) => option.setName('channel').setDescription('The channel to unlock').addChannelTypes(ChannelType.GuildText, ChannelType.GuildForum).setRequired(true))
				.addStringOption((option) => option.setName('reason').setDescription('Reason for unlocking the channel').setRequired(false))
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
			return interaction.reply({ content: 'That channel cannot be unlocked.', flags: MessageFlags.Ephemeral });
		}
		const reason = interaction.options.getString('reason') ?? 'No reason provided';
		try {
			await ChannelLockService.unlock(guild, channel.id);
			return interaction.reply({ content: `Unlocked ${channel}. Reason: ${reason}`, flags: MessageFlags.Ephemeral });
		} catch (error) {
			this.container.logger.error('Error unlocking channel:', error);
			return interaction.reply({ content: 'Failed to unlock the channel. Check my permissions and try again.', flags: MessageFlags.Ephemeral });
		}
	}
}
