import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, MessageFlags, ChannelType } from 'discord.js';
import { Guild } from '../../models/Guild';
import { ErrorHandler } from '../../lib/structures/ErrorHandler';
import { getAllModuleKeys, getModuleConfig } from '../../config/modules';
import { clearGuildPrefixCache, setGuildPrefixInCache } from '../../lib/utils/prefixCache';
import { clearGuildAutomation } from '../../lib/utils/guildAutomationCache';
import { clearDisabledCommandsCache, CRITICAL_COMMANDS } from '../../lib/utils/disabledCommandsCache';
import { HybridCommand } from '../../lib/structures/HybridCommand';
import { commandHelpEmbed } from '../../lib/utils/commandHelp';
import { LOG_EVENT_GROUPS } from '../../lib/logging/logEvents';

/**
 * Log events each `/config log` target is responsible for. Setting a channel is
 * the user saying "I want these logs here", so the matching toggles are turned
 * on — otherwise the channel is saved but the events stay disabled (several of
 * them default to off) and the channel looks broken.
 */
const LOG_CHANNEL_EVENTS: Record<string, string[]> = {
	mod: ['mod.ban', 'mod.unban', 'mod.kick', 'mod.timeout', 'mod.untimeout', 'mod.mute', 'mod.unmute', 'mod.warn', 'mod.purge', 'automod.action'],
	member: ['member.join', 'member.leave', 'member.boost'],
	'message-edit': ['message.edit'],
	'message-delete': ['message.delete', 'message.bulkDelete'],
	message: ['message.edit', 'message.delete', 'message.bulkDelete'],
	nickname: ['member.nickname'],
	role: ['member.roles'],
	// The default channel receives every event, so it enables every event —
	// otherwise voice/channel/role/emoji/invite/thread logs stay off forever and
	// there is no way to turn them on without the dashboard.
	default: LOG_EVENT_GROUPS.flatMap((group) => group.events.map((event) => event.key))
};

@ApplyOptions<Command.Options>({
	name: 'config',
	description: 'Configure server settings',
	preconditions: ['GuildOnly'],
	fullCategory: ['Administration']
})
export class ConfigCommand extends HybridCommand {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('config')
				.setDescription('Configure server settings')
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.setDMPermission(false)
				.addSubcommandGroup((group) =>
					group
						.setName('role')
						.setDescription('Configure server roles')
						.addSubcommand((subcommand) =>
							subcommand
								.setName('admin')
								.setDescription('Set or clear the administrator role')
								.addRoleOption((option) => option.setName('role').setDescription('Role to set; omit to clear').setRequired(false))
						)
						.addSubcommand((subcommand) =>
							subcommand
								.setName('mod')
								.setDescription('Set or clear the moderator role')
								.addRoleOption((option) => option.setName('role').setDescription('Role to set; omit to clear').setRequired(false))
						)
						.addSubcommand((subcommand) =>
							subcommand
								.setName('mute')
								.setDescription('Set or clear the mute role')
								.addRoleOption((option) => option.setName('role').setDescription('Role to set; omit to clear').setRequired(false))
						)
						.addSubcommand((subcommand) =>
							subcommand
								.setName('auto')
								.setDescription('Set or clear the auto-assign role')
								.addRoleOption((option) => option.setName('role').setDescription('Role to set; omit to clear').setRequired(false))
						)
				)
				.addSubcommandGroup((group) => {
					group.setName('log').setDescription('Configure log channels');
					for (const [name, description] of [
						['mod', 'moderation actions'],
						['member', 'member joins and departures'],
						['message-edit', 'message edits'],
						['message-delete', 'message deletions'],
						['message', 'message edits and deletions'],
						['nickname', 'nickname changes'],
						['role', 'role changes'],
						['default', 'default log events']
					] as const) {
						group.addSubcommand((subcommand) =>
							subcommand
								.setName(name)
								.setDescription(`Set or clear the ${description} log channel`)
								.addChannelOption((option) =>
									option
										.setName('channel')
										.setDescription('Channel to set; omit to clear')
										.setRequired(false)
										.addChannelTypes(ChannelType.GuildText)
								)
						);
					}
					return group;
				})
				.addSubcommand((subcommand) =>
					subcommand
						.setName('prefix')
						.setDescription('Set or reset the command prefix')
						.addStringOption((option) =>
							option
								.setName('prefix')
								.setDescription('New prefix, up to 3 characters; omit to reset')
								.setRequired(false)
								.setMaxLength(3)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('module')
						.setDescription('Enable or disable a module')
						.addStringOption((option) =>
							option
								.setName('module')
								.setDescription('Module to configure')
								.setRequired(true)
								.setChoices(
									...getAllModuleKeys().map((key) => ({
										name: getModuleConfig(key)?.name ?? key,
										value: key
									}))
								)
						)
						.addStringOption((option) =>
							option
								.setName('action')
								.setDescription('Enable or disable the module')
								.setRequired(true)
								.addChoices({ name: 'Enable', value: 'enable' }, { name: 'Disable', value: 'disable' })
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('command')
						.setDescription('Enable or disable a command')
						.addStringOption((option) =>
							option.setName('command').setDescription('Command to configure').setRequired(true).setAutocomplete(true)
						)
						.addStringOption((option) =>
							option
								.setName('action')
								.setDescription('Enable or disable the command')
								.setRequired(true)
								.addChoices({ name: 'Enable', value: 'enable' }, { name: 'Disable', value: 'disable' })
						)
				)
				.addSubcommand((subcommand) => subcommand.setName('help').setDescription('Show the configuration options and usage'))
		);
	}

	public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
		const focused = interaction.options.getFocused(true);
		if (focused.name !== 'command') return interaction.respond([]);

		const value = focused.value.toLowerCase();
		const commands = Array.from(this.container.stores.get('commands').values())
			.filter((command) => !CRITICAL_COMMANDS.has(command.name.toLowerCase()) && command.name.toLowerCase().includes(value))
			.map((command) => ({ name: command.name, value: command.name }))
			.slice(0, 25);

		return interaction.respond(commands);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const group = interaction.options.getSubcommandGroup(false);
		const subcommand = interaction.options.getSubcommand();

		if (group === null && subcommand === 'help') {
			return interaction.reply({
				embeds: [
					commandHelpEmbed(this, 'Configure roles, logging channels, prefixes, modules, and commands.').addFields(
						{ name: '/config role', value: '`admin` `mod` `mute` `auto`' },
						{ name: '/config log', value: '`mod` `member` `message-edit` `message-delete` `message` `nickname` `role` `default`' }
					)
				],
				flags: MessageFlags.Ephemeral
			});
		}

		const member = interaction.member;
		const isOwner = interaction.guild?.ownerId === member?.user.id;
		if (!isOwner && !this.hasAdminPermissions(member)) {
			return ErrorHandler.sendPermissionError(interaction, 'Administrator');
		}

		const guildId = interaction.guildId!;
		let guildData = await Guild.findOne({ guildId });
		if (!guildData) guildData = new Guild({ guildId });

		if (group === 'role') {
			if (subcommand === 'admin' && !isOwner) {
				return ErrorHandler.sendCommandError(interaction, 'Only the server owner can set the administrator role.');
			}

			const role = interaction.options.getRole('role');
			if (role && (role.id === interaction.guild?.roles.everyone.id || role.managed)) {
				return ErrorHandler.sendCommandError(interaction, 'The @everyone and managed integration roles cannot be assigned here.');
			}
			if (subcommand === 'admin') guildData.adminRoleId = role?.id;
			if (subcommand === 'mod') guildData.modRoleId = role?.id;
			if (subcommand === 'mute') guildData.muteRoleId = role?.id;
			if (subcommand === 'auto') guildData.autoroleId = role?.id;
			await guildData.save();
			if (subcommand === 'admin' || subcommand === 'mod' || subcommand === 'mute') clearGuildAutomation(guildId);

			return interaction.reply({
				content: role ? `The ${subcommand} role has been set to ${role}.` : `The ${subcommand} role has been cleared.`,
				flags: MessageFlags.Ephemeral
			});
		}

		if (group === 'log') {
			const channel = interaction.options.getChannel('channel');
			if (channel && channel.type !== ChannelType.GuildText) {
				return interaction.reply({ content: 'Please select a text channel.', flags: MessageFlags.Ephemeral });
			}

			// Saving a channel the bot cannot post in creates a log channel that
			// silently never receives anything. Fail loudly instead.
			if (channel) {
				const missing = this.missingLogPermissions(interaction, channel.id);
				if (missing.length > 0) {
					return ErrorHandler.sendCommandError(
						interaction,
						`I can't post logs in ${channel} yet — missing ${missing.join(', ')}. Fix the channel permissions and run this again.`
					);
				}
			}

			if (subcommand === 'message') {
				guildData.messageEditLogChannelId = channel?.id;
				guildData.messageDeleteLogChannelId = channel?.id;
			} else {
				const fields = {
					mod: 'modLogChannelId',
					member: 'memberLogChannelId',
					'message-edit': 'messageEditLogChannelId',
					'message-delete': 'messageDeleteLogChannelId',
					nickname: 'nicknameLogChannelId',
					role: 'roleLogChannelId',
					default: 'logChannelId'
				} as const;
				const field = fields[subcommand as keyof typeof fields];
				if (!field) return ErrorHandler.sendCommandError(interaction, 'Invalid subcommand.');
				guildData[field] = channel?.id;
			}

			// Clearing a channel leaves the toggles alone: the dashboard may still be
			// routing those events through a per-event channel.
			const enabledEvents = channel ? this.enableLogEvents(guildData, subcommand) : [];

			await guildData.save();

			if (!channel) {
				return interaction.reply({
					content: `The ${subcommand} log channel has been cleared.`,
					flags: MessageFlags.Ephemeral
				});
			}

			const lines = [`The ${subcommand} log channel has been set to ${channel}.`];
			if (enabledEvents.length > 0) {
				lines.push(
					enabledEvents.length > 6
						? `Enabled all ${enabledEvents.length} log events.`
						: `Enabled log events: ${enabledEvents.map((key) => `\`${key}\``).join(', ')}.`
				);
			}
			lines.push('Logging starts as soon as the next matching event fires.');
			return interaction.reply({ content: lines.join('\n'), flags: MessageFlags.Ephemeral });
		}

		if (subcommand === 'prefix') return this.setPrefix(interaction, guildData);
		if (subcommand === 'module') return this.setModule(interaction);
		if (subcommand === 'command') return this.setCommand(interaction);

		return ErrorHandler.sendCommandError(interaction, 'Invalid subcommand.');
	}

	private async setPrefix(interaction: Command.ChatInputCommandInteraction, guildData: InstanceType<typeof Guild>) {
		const prefix = interaction.options.getString('prefix');
		if (prefix && (prefix.length > 3 || prefix.includes(' '))) {
			return interaction.reply({ content: 'The prefix must be 1 to 3 characters and cannot contain spaces.', flags: MessageFlags.Ephemeral });
		}

		const guildId = interaction.guildId!;
		if (prefix) {
			guildData.prefix = prefix;
			await guildData.save();
			setGuildPrefixInCache(guildId, prefix);
			return interaction.reply({ content: `The command prefix has been set to \`${prefix}\`.`, flags: MessageFlags.Ephemeral });
		}

		guildData.prefix = undefined;
		await guildData.save();
		clearGuildPrefixCache(guildId);
		const defaultPrefix = this.container.client.options.defaultPrefix || '!';
		return interaction.reply({ content: `The command prefix has been reset to \`${defaultPrefix}\`.`, flags: MessageFlags.Ephemeral });
	}

	private async setModule(interaction: Command.ChatInputCommandInteraction) {
		const guildId = interaction.guildId!;
		const moduleKey = interaction.options.getString('module', true);
		const moduleConfig = getModuleConfig(moduleKey);
		if (!moduleConfig) return ErrorHandler.sendCommandError(interaction, `Module "${moduleKey}" does not exist.`);

		const enabled = interaction.options.getString('action', true) === 'enable';
		await Guild.findOneAndUpdate({ guildId }, { $set: { [`modules.${moduleKey}`]: enabled } }, { upsert: true });
		clearGuildAutomation(guildId);
		return interaction.reply({
			content: `The ${moduleConfig.name} module has been ${enabled ? 'enabled' : 'disabled'} for this server.`,
			flags: MessageFlags.Ephemeral
		});
	}

	private async setCommand(interaction: Command.ChatInputCommandInteraction) {
		const commandName = interaction.options.getString('command', true).toLowerCase();
		const action = interaction.options.getString('action', true);
		const commands = this.container.stores.get('commands');
		const command = commands.get(commandName) ?? commands.find((entry) => entry.name.toLowerCase() === commandName);
		if (!command) return ErrorHandler.sendCommandError(interaction, `Command \`${commandName}\` not found.`);
		if (action === 'disable' && CRITICAL_COMMANDS.has(commandName)) {
			return ErrorHandler.sendCommandError(interaction, `Cannot disable critical command \`${commandName}\`.`);
		}

		const guildId = interaction.guildId!;
		let guildData = await Guild.findOne({ guildId });
		if (!guildData) guildData = new Guild({ guildId });
		guildData.disabledCommands ??= [];

		const isDisabled = guildData.disabledCommands.includes(commandName);
		if (action === 'disable') {
			if (isDisabled) return ErrorHandler.sendCommandError(interaction, `Command \`${commandName}\` is already disabled.`);
			guildData.disabledCommands.push(commandName);
		} else {
			if (!isDisabled) return ErrorHandler.sendCommandError(interaction, `Command \`${commandName}\` is not disabled.`);
			guildData.disabledCommands = guildData.disabledCommands.filter((name) => name !== commandName);
		}

		await guildData.save();
		clearDisabledCommandsCache(guildId);
		return interaction.reply({
			content: `Command \`${commandName}\` has been ${action === 'enable' ? 'enabled' : 'disabled'} for this server.`,
			flags: MessageFlags.Ephemeral
		});
	}

	private hasAdminPermissions(member: any) {
		return member.permissions.has([
			PermissionFlagsBits.ManageChannels,
			PermissionFlagsBits.ManageRoles,
			PermissionFlagsBits.BanMembers,
			PermissionFlagsBits.KickMembers,
			PermissionFlagsBits.ModerateMembers
		]);
	}

	/** Permissions the bot is missing in the target channel (empty when it can post). */
	private missingLogPermissions(interaction: Command.ChatInputCommandInteraction, channelId: string): string[] {
		const me = interaction.guild?.members.me;
		const channel = interaction.guild?.channels.resolve(channelId);
		if (!me || !channel || !channel.isTextBased()) return ['View Channel', 'Send Messages'];

		const permissions = channel.permissionsFor(me);
		if (!permissions) return ['View Channel', 'Send Messages'];

		const missing: string[] = [];
		if (!permissions.has(PermissionFlagsBits.ViewChannel)) missing.push('View Channel');
		if (!permissions.has(PermissionFlagsBits.SendMessages)) missing.push('Send Messages');
		if (!permissions.has(PermissionFlagsBits.EmbedLinks)) missing.push('Embed Links');
		return missing;
	}

	/** Turn on the events owned by a `/config log` target; returns the keys that changed. */
	private enableLogEvents(guildData: InstanceType<typeof Guild>, subcommand: string): string[] {
		const keys = LOG_CHANNEL_EVENTS[subcommand] ?? [];
		if (keys.length === 0) return [];

		// `logEvents` is a Mixed field: reassign so Mongoose marks it dirty.
		const next: Record<string, boolean> = { ...(guildData.logEvents ?? {}) };
		const enabled: string[] = [];
		for (const key of keys) {
			if (next[key] === true) continue;
			next[key] = true;
			enabled.push(key);
		}

		if (enabled.length > 0) guildData.logEvents = next;
		return enabled;
	}
}
