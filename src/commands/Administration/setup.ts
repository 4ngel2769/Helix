import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ChannelType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { getAllModuleKeys, getModuleConfig, moduleOptionName } from '../../config/modules';
import { HybridCommand } from '../../lib/structures/HybridCommand';
import { clearGuildAutomation } from '../../lib/utils/guildAutomationCache';
import { setGuildPrefixInCache } from '../../lib/utils/prefixCache';
import { Guild } from '../../models/Guild';

@ApplyOptions<Command.Options>({
	name: 'setup',
	description: 'Configure server setup with a restart-safe wizard',
	preconditions: ['GuildOnly'],
	requiredUserPermissions: ['ManageGuild'],
	fullCategory: ['Administration']
})
export class SetupCommand extends HybridCommand {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => {
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
				.setDMPermission(false)
				.addSubcommand((subcommand) => subcommand.setName('start').setDescription('Start or resume the setup wizard'))
				.addSubcommand((subcommand) => subcommand.setName('status').setDescription('Show the current setup step'))
				.addSubcommand((subcommand) =>
					subcommand
						.setName('roles')
						.setDescription('Configure staff and verification roles')
						.addRoleOption((option) => option.setName('admin-role').setDescription('Administrator role; owner only').setRequired(false))
						.addRoleOption((option) => option.setName('mod-role').setDescription('Moderator role').setRequired(false))
						.addRoleOption((option) => option.setName('mute-role').setDescription('Muted-members role').setRequired(false))
						.addRoleOption((option) => option.setName('verification-role').setDescription('Role granted after verification').setRequired(false))
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('channels')
						.setDescription('Configure setup channels')
						.addChannelOption((option) => option.setName('log-channel').setDescription('Moderation log channel').setRequired(false).addChannelTypes(ChannelType.GuildText))
						.addChannelOption((option) => option.setName('verification-channel').setDescription('Verification channel').setRequired(false).addChannelTypes(ChannelType.GuildText))
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('prefix')
						.setDescription('Configure the message command prefix')
						.addStringOption((option) => option.setName('prefix').setDescription('Prefix up to 3 characters; omit to keep current').setRequired(false).setMinLength(1).setMaxLength(3))
				)
				.addSubcommand((subcommand) => {
					for (const moduleKey of getAllModuleKeys()) {
						const moduleName = getModuleConfig(moduleKey)?.name ?? moduleKey;
						subcommand.addStringOption((option) =>
							option
								.setName(moduleOptionName(moduleKey))
								.setDescription(`${moduleName}: leave unchanged, enable, or disable`)
								.setRequired(false)
								.addChoices(
									{ name: 'Leave unchanged', value: 'keep' },
									{ name: 'Enable', value: 'enable' },
									{ name: 'Disable', value: 'disable' }
								)
						);
					}
					return subcommand.setName('modules').setDescription('Configure module states');
				})
				.addSubcommand((subcommand) => subcommand.setName('finish').setDescription('Finish the setup wizard'))
				.addSubcommand((subcommand) => subcommand.setName('cancel').setDescription('Cancel the setup wizard'))
				.addSubcommand((subcommand) => {
					subcommand
						.setName('legacy')
						.setDescription('Apply optional setup values in one command')
						.addRoleOption((option) => option.setName('admin-role').setDescription('Administrator role').setRequired(false))
						.addRoleOption((option) => option.setName('mod-role').setDescription('Moderator role').setRequired(false))
						.addRoleOption((option) => option.setName('mute-role').setDescription('Muted-members role').setRequired(false))
						.addChannelOption((option) => option.setName('log-channel').setDescription('Moderation log channel').setRequired(false).addChannelTypes(ChannelType.GuildText))
						.addStringOption((option) => option.setName('prefix').setDescription('Message command prefix, up to 3 characters').setRequired(false).setMinLength(1).setMaxLength(3))
						.addChannelOption((option) => option.setName('verification-channel').setDescription('Verification channel').setRequired(false).addChannelTypes(ChannelType.GuildText))
						.addRoleOption((option) => option.setName('verification-role').setDescription('Role granted after verification').setRequired(false));
					for (const moduleKey of getAllModuleKeys()) {
						const moduleName = getModuleConfig(moduleKey)?.name ?? moduleKey;
						subcommand.addStringOption((option) =>
							option
								.setName(moduleOptionName(moduleKey))
								.setDescription(`${moduleName}: leave unchanged, enable, or disable`)
								.setRequired(false)
								.addChoices(
									{ name: 'Leave unchanged', value: 'keep' },
									{ name: 'Enable', value: 'enable' },
									{ name: 'Disable', value: 'disable' }
								)
						);
					}
					return subcommand;
				});
			return builder;
		});
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const guildId = interaction.guildId;
		if (!guildId) return interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
		switch (interaction.options.getSubcommand()) {
			case 'start':
				return this.start(interaction, guildId);
			case 'status':
				return this.status(interaction, guildId);
			case 'cancel':
				return this.cancel(interaction, guildId);
			case 'finish':
				return this.finish(interaction, guildId);
			case 'roles':
				return this.roles(interaction, guildId);
			case 'channels':
				return this.channels(interaction, guildId);
			case 'prefix':
				return this.prefix(interaction, guildId);
			case 'modules':
				return this.modules(interaction, guildId);
			case 'legacy':
				return this.legacy(interaction, guildId);
			default:
				return interaction.reply({ content: 'Unknown setup subcommand.', flags: MessageFlags.Ephemeral });
		}
	}

	private async start(interaction: Command.ChatInputCommandInteraction, guildId: string) {
		const guildData = (await Guild.findOne({ guildId })) ?? new Guild({ guildId });
		if (guildData.setupWizard) return this.reply(interaction, `Setup is already in progress. Current step: ${guildData.setupWizard.step}.`);
		guildData.setupWizard = { startedBy: interaction.user.id, step: 'roles', updatedAt: new Date() };
		await guildData.save();
		return this.reply(interaction, 'Setup wizard started. Configure roles with `/setup roles`, then continue through each step.');
	}

	private async status(interaction: Command.ChatInputCommandInteraction, guildId: string) {
		const guildData = await Guild.findOne({ guildId }, { setupWizard: 1 }).lean();
		if (!guildData?.setupWizard) return this.reply(interaction, 'No setup wizard is active. Start one with `/setup start`.');
		return this.reply(interaction, `Setup step: **${guildData.setupWizard.step}**. Started by <@${guildData.setupWizard.startedBy}>.`);
	}

	private async cancel(interaction: Command.ChatInputCommandInteraction, guildId: string) {
		const guildData = await Guild.findOne({ guildId });
		if (!guildData?.setupWizard) return this.reply(interaction, 'No setup wizard is active.');
		if (!this.canContinue(interaction, guildData.setupWizard.startedBy)) return this.reply(interaction, 'Only the setup starter or server owner can cancel this wizard.');
		guildData.setupWizard = undefined;
		await guildData.save();
		return this.reply(interaction, 'Setup wizard cancelled.');
	}

	private async finish(interaction: Command.ChatInputCommandInteraction, guildId: string) {
		const guildData = await Guild.findOne({ guildId });
		if (!guildData?.setupWizard) return this.reply(interaction, 'No setup wizard is active.');
		if (!this.canContinue(interaction, guildData.setupWizard.startedBy)) return this.reply(interaction, 'Only the setup starter or server owner can finish this wizard.');
		if (guildData.setupWizard.step !== 'finish') return this.reply(interaction, `Complete the **${guildData.setupWizard.step}** step first.`);
		guildData.setupWizard = undefined;
		await guildData.save();
		return this.reply(interaction, 'Setup finished. Essential settings are saved.');
	}

	private async roles(interaction: Command.ChatInputCommandInteraction, guildId: string) {
		const guildData = await this.wizardGuild(interaction, guildId, 'roles');
		if (!guildData) return;
		const adminRole = interaction.options.getRole('admin-role');
		const modRole = interaction.options.getRole('mod-role');
		const muteRole = interaction.options.getRole('mute-role');
		const verificationRole = interaction.options.getRole('verification-role');
		if (adminRole && interaction.guild?.ownerId !== interaction.user.id) return this.reply(interaction, 'Only the server owner can configure the administrator role.');
		const roles = [adminRole, modRole, muteRole, verificationRole].filter((role): role is NonNullable<typeof role> => role !== null);
		if (roles.some((role) => role.id === interaction.guild?.roles.everyone.id || role.managed)) return this.reply(interaction, 'The @everyone and managed integration roles cannot be assigned here.');
		if (adminRole) guildData.adminRoleId = adminRole.id;
		if (modRole) guildData.modRoleId = modRole.id;
		if (muteRole) guildData.muteRoleId = muteRole.id;
		if (verificationRole) guildData.verificationRoleId = verificationRole.id;
		guildData.setupWizard!.step = 'channels';
		guildData.setupWizard!.updatedAt = new Date();
		await guildData.save();
		if (adminRole || modRole || muteRole) clearGuildAutomation(guildId);
		return this.reply(interaction, 'Roles saved. Next: `/setup channels`.');
	}

	private async channels(interaction: Command.ChatInputCommandInteraction, guildId: string) {
		const guildData = await this.wizardGuild(interaction, guildId, 'channels');
		if (!guildData) return;
		const logChannel = interaction.options.getChannel('log-channel', false, [ChannelType.GuildText]);
		const verificationChannel = interaction.options.getChannel('verification-channel', false, [ChannelType.GuildText]);
		if (logChannel) guildData.modLogChannelId = logChannel.id;
		if (verificationChannel) guildData.verificationChannelId = verificationChannel.id;
		guildData.setupWizard!.step = 'prefix';
		guildData.setupWizard!.updatedAt = new Date();
		await guildData.save();
		return this.reply(interaction, 'Channels saved. Next: `/setup prefix`.');
	}

	private async prefix(interaction: Command.ChatInputCommandInteraction, guildId: string) {
		const guildData = await this.wizardGuild(interaction, guildId, 'prefix');
		if (!guildData) return;
		const prefix = interaction.options.getString('prefix');
		if (prefix?.includes(' ')) return this.reply(interaction, 'The prefix cannot contain spaces.');
		if (prefix) guildData.prefix = prefix;
		guildData.setupWizard!.step = 'modules';
		guildData.setupWizard!.updatedAt = new Date();
		await guildData.save();
		if (prefix) setGuildPrefixInCache(guildId, prefix);
		return this.reply(interaction, 'Prefix saved. Next: `/setup modules`.');
	}

	private async modules(interaction: Command.ChatInputCommandInteraction, guildId: string) {
		const guildData = await this.wizardGuild(interaction, guildId, 'modules');
		if (!guildData) return;
		guildData.modules ??= {};
		let changed = false;
		for (const key of getAllModuleKeys()) {
			const action = interaction.options.getString(moduleOptionName(key));
			if (action === 'enable' || action === 'disable') {
				guildData.modules[key] = action === 'enable';
				changed = true;
			}
		}
		guildData.setupWizard!.step = 'finish';
		guildData.setupWizard!.updatedAt = new Date();
		await guildData.save();
		if (changed) clearGuildAutomation(guildId);
		return this.reply(interaction, 'Modules saved. Finish with `/setup finish`.');
	}

	private async legacy(interaction: Command.ChatInputCommandInteraction, guildId: string) {
		const adminRole = interaction.options.getRole('admin-role');
		const modRole = interaction.options.getRole('mod-role');
		const muteRole = interaction.options.getRole('mute-role');
		const logChannel = interaction.options.getChannel('log-channel', false, [ChannelType.GuildText]);
		const prefix = interaction.options.getString('prefix');
		const verificationChannel = interaction.options.getChannel('verification-channel', false, [ChannelType.GuildText]);
		const verificationRole = interaction.options.getRole('verification-role');
		const moduleActions = getAllModuleKeys().map((key) => [key, interaction.options.getString(moduleOptionName(key))] as const);
		if (!adminRole && !modRole && !muteRole && !logChannel && !prefix && !verificationChannel && !verificationRole && moduleActions.every(([, action]) => !action)) return this.reply(interaction, 'Provide at least one setting to update.');
		if (prefix?.includes(' ')) return this.reply(interaction, 'The prefix cannot contain spaces.');
		if (adminRole && interaction.guild?.ownerId !== interaction.user.id) return this.reply(interaction, 'Only the server owner can configure the administrator role.');
		const roles = [adminRole, modRole, muteRole].filter((role): role is NonNullable<typeof role> => role !== null);
		if (roles.some((role) => role.id === interaction.guild?.roles.everyone.id || role.managed)) return this.reply(interaction, 'The @everyone and managed integration roles cannot be assigned here.');
		const guildData = (await Guild.findOne({ guildId })) ?? new Guild({ guildId });
		if (adminRole) guildData.adminRoleId = adminRole.id;
		if (modRole) guildData.modRoleId = modRole.id;
		if (muteRole) guildData.muteRoleId = muteRole.id;
		if (logChannel) guildData.modLogChannelId = logChannel.id;
		if (prefix) guildData.prefix = prefix;
		if (verificationChannel) guildData.verificationChannelId = verificationChannel.id;
		if (verificationRole) guildData.verificationRoleId = verificationRole.id;
		guildData.modules ??= {};
		let modulesChanged = false;
		for (const [key, action] of moduleActions) {
			if (action === 'enable' || action === 'disable') {
				guildData.modules[key] = action === 'enable';
				modulesChanged = true;
			}
		}
		await guildData.save();
		if (prefix) setGuildPrefixInCache(guildId, prefix);
		if (modulesChanged || adminRole || modRole || muteRole) clearGuildAutomation(guildId);
		return this.reply(interaction, 'Essential server settings updated. Use `/setup-verification` to post the verification message.');
	}

	private async wizardGuild(interaction: Command.ChatInputCommandInteraction, guildId: string, step: 'roles' | 'channels' | 'prefix' | 'modules') {
		const guildData = await Guild.findOne({ guildId });
		if (!guildData?.setupWizard) {
			await this.reply(interaction, 'No setup wizard is active. Start one with `/setup start`.');
			return null;
		}
		if (!this.canContinue(interaction, guildData.setupWizard.startedBy)) {
			await this.reply(interaction, 'Only the setup starter or server owner can continue this wizard.');
			return null;
		}
		if (guildData.setupWizard.step !== step) {
			await this.reply(interaction, `Current step is **${guildData.setupWizard.step}**, not **${step}**.`);
			return null;
		}
		return guildData;
	}

	private canContinue(interaction: Command.ChatInputCommandInteraction, startedBy: string): boolean {
		return startedBy === interaction.user.id || interaction.guild?.ownerId === interaction.user.id;
	}

	private reply(interaction: Command.ChatInputCommandInteraction, content: string) {
		return interaction.reply({ content, flags: MessageFlags.Ephemeral });
	}
}
