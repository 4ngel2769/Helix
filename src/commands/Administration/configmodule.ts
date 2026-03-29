import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord.js';
import { getAllModuleKeys, getModuleConfig } from '../../config/modules';
import { GuildConfigService } from '../../lib/services/GuildConfigService';

@ApplyOptions<Command.Options>({
	name: 'configmodule',
	description: 'Configure modules for your server',
	requiredUserPermissions: ['Administrator']
})
export class ConfigModuleCommand extends Command {
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
				ephemeral: true
			});
		}

		const moduleKey = interaction.options.getString('module', true);
		const action = interaction.options.getString('action', true);

		// Check if the module exists
		const moduleConfig = getModuleConfig(moduleKey);
		if (!moduleConfig) {
			return interaction.reply({
				content: `Module "${moduleKey}" does not exist.`,
				ephemeral: true
			});
		}

		// Get or create guild data
		const guildData = await GuildConfigService.getOrCreateGuildData(guildId);

		// Ensure modules object exists
		if (!guildData.modules) {
			guildData.modules = {};
		}

		// Use switch for action logic
		switch (action) {
			case 'enable':
			case 'disable': {
				const enabled = action === 'enable';
				guildData.modules[moduleKey] = enabled;
				// Save changes to DB
				await guildData.save();

				// Confirmation reply
				return interaction.reply({
					content: `The ${moduleConfig.name} module has been ${enabled ? 'enabled' : 'disabled'} for this server.`,
					ephemeral: true
				});
			}
			default:
				// Handle unknown actions
				return interaction.reply({
					content: 'Invalid action.',
					ephemeral: true
				});
		}
	}

}
