import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, MessageFlags } from 'discord.js';

@ApplyOptions<Command.Options>({
	name: 'adminexample',
	description: 'An example admin command template',
	requiredUserPermissions: ['Administrator']
})
export class AdminExampleCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.addStringOption((option) =>
					option
						.setName('example')
						.setDescription('An example string option')
						.setRequired(false)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		// Permission check is handled by Paperplane (Sapphire)
		const exampleValue = interaction.options.getString('example') || 'No value provided';
		return interaction.reply({
			content: `Admin example command executed! Option value: ${exampleValue}`,
			flags: MessageFlags.Ephemeral
		});
	}
}
