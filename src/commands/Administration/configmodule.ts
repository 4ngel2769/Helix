import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord.js';
import { Guild as GuildModel } from '../../models/Guild';
import { getAllModuleKeys, getModuleConfig } from '../../config/modules';

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
		let guildData = await GuildModel.findOne({ guildId });
		if (!guildData) {
			const defaultData = this.createDefaultGuildData(guildId);
			guildData = new GuildModel(defaultData);
		}

		// Update module status
		if (!guildData.modules) {
			guildData.modules = {};
		}

		const enabled = action === 'enable';
		guildData.modules[moduleKey] = enabled;

		// Save changes
		await guildData.save();

		return interaction.reply({
			content: `The ${moduleConfig.name} module has been ${enabled ? 'enabled' : 'disabled'} for this server.`,
			ephemeral: true
		});
	}

	private createDefaultGuildData(guildId: string) {
		const modules: Record<string, boolean> = {};

		// Use our module configs to set default values
		getAllModuleKeys().forEach((moduleKey) => {
			const config = getModuleConfig(moduleKey);
			if (config) {
				modules[moduleKey] = config.defaultEnabled;
			}
		});

		return {
			guildId,
			modules
		};
	}
}
