import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getAllModuleKeys, getModuleConfig } from '../../config/modules';
import { Guild } from '../../models/Guild';
import { clearGuildAutomation } from '../../lib/utils/guildAutomationCache';

import { HybridCommand } from '../../lib/structures/HybridCommand';

@ApplyOptions<Command.Options>({
	name: 'configmodule',
	description: 'Configure modules for your server',
	requiredUserPermissions: ['Administrator']
})
export class ConfigModuleCommand extends HybridCommand {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.addStringOption((option) =>
					option
						.setName('module')
						.setDescription('The module to configure')
						.setRequired(true)
						.setChoices(
							...getAllModuleKeys().map((key) => {
								const config = getModuleConfig(key);
								return {
									name: config?.name || key,
									value: key
								};
							})
						)
				)
				.addStringOption((option) =>
					option
						.setName('action')
						.setDescription('Enable or disable the module')
						.setRequired(true)
						.addChoices({ name: 'Enable', value: 'enable' }, { name: 'Disable', value: 'disable' })
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const guildId = interaction.guildId;
		if (!guildId) {
			return interaction.reply({
				content: 'This command can only be used in a server.',
				flags: MessageFlags.Ephemeral
			});
		}

		const moduleKey = interaction.options.getString('module', true);
		const action = interaction.options.getString('action', true);

		// Check if the module exists
		const moduleConfig = getModuleConfig(moduleKey);
		if (!moduleConfig) {
			return interaction.reply({
				content: `Module "${moduleKey}" does not exist.`,
				flags: MessageFlags.Ephemeral
			});
		}

		// Use switch for action logic
		switch (action) {
			case 'enable':
			case 'disable': {
				const enabled = action === 'enable';
				// Atomic $set: Guild.modules is a Mixed path, so in-place
				// mutation + save() would silently persist nothing.
				await Guild.findOneAndUpdate(
					{ guildId },
					{ $set: { [`modules.${moduleKey}`]: enabled } },
					{ upsert: true }
				);
				clearGuildAutomation(guildId);

				// Confirmation reply
				return interaction.reply({
					content: `The ${moduleConfig.name} module has been ${enabled ? 'enabled' : 'disabled'} for this server.`,
					flags: MessageFlags.Ephemeral
				});
			}
			default:
				// Handle unknown actions
				return interaction.reply({
					content: 'Invalid action.',
					flags: MessageFlags.Ephemeral
				});
		}
	}

}
