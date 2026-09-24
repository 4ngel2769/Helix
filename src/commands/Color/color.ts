import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import { HybridModuleCommand } from '../../lib/structures/HybridCommand';
import { commandHelpEmbed } from '../../lib/utils/commandHelp';
import { AdministrationModule } from '../../modules/Administration';

@ApplyOptions<Command.Options>({
	name: 'color',
	description: 'View information about colors and manage your color role'
})
export class ColorCommand extends HybridModuleCommand<AdministrationModule> {
	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, {
			...options,
			module: 'Administration',
			description: 'View information about colors and manage your color role',
			enabled: true
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('color')
				.setDescription('View information about colors and manage your color role')
				.addSubcommand((subcommand) =>
					subcommand
						.setName('colorinfo')
						.setDescription('Get detailed info about a hex color')
						.addStringOption((option) => option.setName('hex').setDescription('Hex color (e.g. #ff0000)').setRequired(false))
				)
				.addSubcommand((subcommand) => subcommand.setName('mycolor').setDescription('Show your current color role'))
				.addSubcommand((subcommand) =>
					subcommand
						.setName('setcolor')
						.setDescription('Set your own name color via a role')
						.addStringOption((option) => option.setName('hex').setDescription('Hex color (e.g. #ff0000)').setRequired(false))
				)
				.addSubcommand((subcommand) => subcommand.setName('help').setDescription('Show the color options and usage'))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		switch (interaction.options.getSubcommand()) {
			case 'colorinfo':
				return this.showColorInfo(interaction);
			case 'mycolor':
				return this.showMyColor(interaction);
			case 'setcolor':
				return this.setMyColor(interaction);
			case 'help':
				return interaction.reply({
					embeds: [commandHelpEmbed(this, 'View color information and manage your color role.')],
					flags: MessageFlags.Ephemeral
				});
			default:
				return interaction.reply('Invalid subcommand.');
		}
	}

	private async showColorInfo(interaction: Command.ChatInputCommandInteraction) {
		const hex = interaction.options.getString('hex');
		if (!hex) return interaction.reply('Provide a hex color (e.g. #ff0000)');

		try {
			const res = await fetch('https://www.thecolorapi.com/id?hex=' + hex.replace('#', ''));
			const data = (await res.json()) as {
				name?: { value?: string };
				hex?: { value?: string };
				rgb?: { value?: string };
				hsl?: { value?: string };
			};
			const embed = new EmbedBuilder()
				.setColor(parseInt(hex.replace('#', ''), 16))
				.setTitle(data.name?.value || 'Color Info')
				.addFields(
					{ name: 'HEX', value: data.hex?.value || hex, inline: true },
					{ name: 'RGB', value: data.rgb?.value || 'N/A', inline: true },
					{ name: 'HSL', value: data.hsl?.value || 'N/A', inline: true }
				);
			return interaction.reply({ embeds: [embed] });
		} catch {
			return interaction.reply('Failed to fetch color info.');
		}
	}

	private showMyColor(interaction: Command.ChatInputCommandInteraction) {
		const member = interaction.member;
		if (!member) return interaction.reply('Could not find you.');
		const roleIds = Array.isArray(member.roles) ? member.roles : [...member.roles.cache.keys()];
		const colorRole = interaction.guild?.roles.cache.find((role) => roleIds.includes(role.id) && role.color !== 0);
		if (!colorRole) return interaction.reply('You have no custom color role.');
		return interaction.reply('Your color: ' + colorRole.name + ' - ' + colorRole.hexColor);
	}

	private async setMyColor(interaction: Command.ChatInputCommandInteraction) {
		const hex = interaction.options.getString('hex');
		if (!hex) return interaction.reply('Provide a hex color (e.g. #ff0000)');
		const color = parseInt(hex.replace('#', ''), 16);
		if (isNaN(color)) return interaction.reply('Invalid color.');
		const member = interaction.member;
		const guild = interaction.guild;
		if (!member || !guild) return interaction.reply('Could not find you in this server.');

		try {
			const existing = guild.roles.cache.find((role) => role.name === '#' + hex);
			const roleIds = Array.isArray(member.roles) ? member.roles : [...member.roles.cache.keys()];
			if (existing && roleIds.includes(existing.id)) {
				return interaction.reply('You already have this color!');
			}
			const role = existing || (await guild.roles.create({ name: '#' + hex, color, reason: 'User color role' }));
			if (role) {
				const guildMember = await guild.members.fetch(interaction.user.id);
				await guildMember.roles.add(role);
				return interaction.reply('Color set to ' + hex + '!');
			}
		} catch {
			return interaction.reply('Failed to set color.');
		}
		return;
	}
}
