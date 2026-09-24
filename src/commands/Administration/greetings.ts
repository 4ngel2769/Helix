import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ChannelType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { AdministrationModule } from '../../modules/Administration';
import { Guild } from '../../models/Guild';
import { HybridModuleCommand } from '../../lib/structures/HybridCommand';
import { getGuildPrefixFromCache, setGuildPrefixInCache } from '../../lib/utils/prefixCache';
import { DEFAULT_FAREWELL_MESSAGE, DEFAULT_WELCOME_MESSAGE, renderMessageTemplate } from '../../lib/utils/messagePlaceholders';

@ApplyOptions<Command.Options>({
	name: 'greetings',
	description: 'Configure member greetings and departures',
	preconditions: ['GuildOnly']
})
export class GreetingsCommand extends HybridModuleCommand<AdministrationModule> {
	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, {
			...options,
			module: 'Administration',
			description: 'Configure member greetings and departures'
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('greetings')
				.setDescription('Configure member greetings and departures')
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('welcome_channel')
						.setDescription('Choose where new members are announced')
						.addChannelOption((option) =>
							option
								.setName('channel')
								.setDescription('The channel for new-member announcements')
								.addChannelTypes(ChannelType.GuildText)
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('welcome_message')
						.setDescription('Write the announcement used for new members')
						.addStringOption((option) =>
							option
								.setName('message')
								.setDescription('The text new members receive; placeholders are supported')
								.setMaxLength(2000)
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('farewell_channel')
						.setDescription('Choose where departing members are announced')
						.addChannelOption((option) =>
							option
								.setName('channel')
								.setDescription('The channel for departure announcements')
								.addChannelTypes(ChannelType.GuildText)
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('farewell_message')
						.setDescription('Write the announcement used for departures')
						.addStringOption((option) =>
							option
								.setName('message')
								.setDescription('The text departing members trigger; placeholders are supported')
								.setMaxLength(2000)
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('ban_message')
						.setDescription('Write the public notice used after a ban')
						.addStringOption((option) =>
							option
								.setName('message')
								.setDescription('The text posted in the departure channel after a ban')
								.setMaxLength(2000)
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('join_dm')
						.setDescription('Write the private note sent to new members')
						.addStringOption((option) =>
							option
								.setName('message')
								.setDescription('The text sent by direct message; placeholders are supported')
								.setMaxLength(2000)
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('test_greet')
						.setDescription('Preview a greeting in its configured channel')
						.addStringOption((option) =>
							option
								.setName('type')
								.setDescription('Choose which greeting to preview')
								.addChoices({ name: 'Welcome', value: 'welcome' }, { name: 'Farewell', value: 'farewell' })
								.setRequired(true)
						)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
			return interaction.reply({ content: 'You need Administrator permission.', flags: MessageFlags.Ephemeral });
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		try {
			const subcommand = interaction.options.getSubcommand();
			const guildId = interaction.guildId!;

			switch (subcommand) {
				case 'welcome_channel': {
					const channel = interaction.options.getChannel('channel', true);
					await this.updateSetting(guildId, 'welcomeChannelId', channel.id);
					return interaction.editReply(`New-member announcements will appear in ${channel}.`);
				}
				case 'welcome_message': {
					const message = interaction.options.getString('message', true);
					await this.updateSetting(guildId, 'welcomeMessage', message);
					return interaction.editReply('The new-member announcement is ready.');
				}
				case 'farewell_channel': {
					const channel = interaction.options.getChannel('channel', true);
					await this.updateSetting(guildId, 'farewellChannelId', channel.id);
					return interaction.editReply(`Departure announcements will appear in ${channel}.`);
				}
				case 'farewell_message': {
					const message = interaction.options.getString('message', true);
					await this.updateSetting(guildId, 'farewellMessage', message);
					return interaction.editReply('The departure announcement is ready.');
				}
				case 'ban_message': {
					const message = interaction.options.getString('message', true);
					await this.updateSetting(guildId, 'banMessage', message);
					return interaction.editReply('The ban announcement is ready.');
				}
				case 'join_dm': {
					const message = interaction.options.getString('message', true);
					await this.updateSetting(guildId, 'joinDmMessage', message);
					return interaction.editReply('The new-member direct message is ready.');
				}
				case 'test_greet': {
					const type = interaction.options.getString('type', true);
					const guildData = await Guild.findOne({ guildId }).lean();
					const channelId = type === 'welcome' ? guildData?.welcomeChannelId : guildData?.farewellChannelId;
					if (!channelId) {
						return interaction.editReply(`Set a ${type} channel before testing that greeting.`);
					}

					const channel = await interaction.guild!.channels.fetch(channelId).catch(() => null);
					if (!channel?.isTextBased()) {
						return interaction.editReply('The configured channel is no longer available.');
					}

					const configuredDefault = this.container.client.options.defaultPrefix;
					const defaultPrefix = (Array.isArray(configuredDefault) ? configuredDefault[0] : configuredDefault) ?? 'x';
					const prefix = getGuildPrefixFromCache(guildId) ?? guildData?.prefix ?? defaultPrefix;
					setGuildPrefixInCache(guildId, prefix);

					const template =
						type === 'welcome'
							? guildData?.welcomeMessage || DEFAULT_WELCOME_MESSAGE
							: guildData?.farewellMessage || DEFAULT_FAREWELL_MESSAGE;
					const text = renderMessageTemplate(template, {
						userMention: `<@${interaction.user.id}>`,
						userName: interaction.user.username,
						userTag: interaction.user.username,
						prefix,
						serverName: interaction.guild!.name,
						serverMembers: interaction.guild!.memberCount
					});
					await channel.send(text);
					return interaction.editReply(`Preview sent to ${channel}.`);
				}
				default:
					return interaction.editReply('That greeting option is not available.');
			}
		} catch (error) {
			this.container.logger.error('Error updating greetings:', error);
			return interaction.editReply('Something went wrong while updating the greeting settings.');
		}
	}

	private async updateSetting(
		guildId: string,
		field: 'welcomeChannelId' | 'welcomeMessage' | 'farewellChannelId' | 'farewellMessage' | 'banMessage' | 'joinDmMessage',
		value: string
	) {
		await Guild.updateOne({ guildId }, { $set: { [field]: value } }, { upsert: true });
	}
}
