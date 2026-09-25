import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ChannelType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { ChannelLockService } from '../../lib/services/ChannelLockService';
import { sendLog, suppressNext } from '../../lib/logging/logService';

import { HybridModuleCommand } from '../../lib/structures/HybridCommand';
import { parseDuration } from '../../lib/utils/duration';

const SLOWMODE_PRESETS: Record<string, number> = { off: 0, '5s': 5, '10s': 10, '30s': 30, '1m': 60, '5m': 300, '15m': 900 };

@ApplyOptions<Command.Options>({ name: 'massaction', description: 'Server-wide moderation actions.', preconditions: ['GuildOnly'],
 cooldownDelay: 10000,
 cooldownLimit: 2
})
export class MassActionCommand extends HybridModuleCommand<ModerationModule> {
	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, { ...options, module: 'Moderation', description: 'Server-wide moderation actions.' });
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('massaction')
				.setDescription('Server-wide moderation actions.')
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
				.setIntegrationTypes(0)
				.setContexts(0)
				.addSubcommand((s) =>
					s
						.setName('nuke')
						.setDescription('Ban a member and delete their recent messages in every text channel.')
						.addUserOption((o) => o.setName('user').setDescription('Member to nuke').setRequired(true))
						.addStringOption((o) => o.setName('reason').setDescription('Reason recorded on the ban').setRequired(false))
						.addIntegerOption((o) => o.setName('days').setDescription('Days of their messages to delete (0-7)').setMinValue(0).setMaxValue(7).setRequired(false))
				)
				.addSubcommand((s) =>
					s
						.setName('clone')
						.setDescription('Duplicate a channel, keeping its overwrites and settings.')
						.addChannelOption((o) => o.setName('channel').setDescription('Channel to duplicate').addChannelTypes(ChannelType.GuildText, ChannelType.GuildCategory, ChannelType.GuildForum).setRequired(true))
						.addStringOption((o) => o.setName('name').setDescription('Name for the copy (default: "<name> copy")').setRequired(false))
				)
				.addSubcommand((s) =>
					s
						.setName('lockdown')
						.setDescription('Lock every text channel that is not already locked.')
						.addStringOption((o) => o.setName('reason').setDescription('Reason shown in the log').setRequired(false))
						.addStringOption((o) => o.setName('time').setDescription('Auto-unlock after (e.g. 30m, 2h, 8h)').setRequired(false))
				)
				.addSubcommand((s) => s.setName('unlockall').setDescription('Unlock every channel Helix has locked.'))
				.addSubcommand((s) =>
					s
						.setName('slowmode')
						.setDescription('Apply a slowmode preset to a channel or the whole server.')
						.addStringOption((o) => o.setName('preset').setDescription('Preset duration').setRequired(true).addChoices(...Object.keys(SLOWMODE_PRESETS).map((v) => ({ name: v, value: v }))))
						.addChannelOption((o) => o.setName('channel').setDescription('Target channel (omit for every text channel)').addChannelTypes(ChannelType.GuildText))
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const guild = interaction.guild;
		if (!guild) return interaction.reply({ content: 'This only works in a server.', flags: MessageFlags.Ephemeral });
		switch (interaction.options.getSubcommand()) {
			case 'nuke':
				return this.nuke(interaction, guild);
			case 'clone':
				return this.clone(interaction, guild);
			case 'lockdown':
				return this.lockdown(interaction, guild);
			case 'unlockall':
				return this.unlockAll(interaction, guild);
			case 'slowmode':
				return this.slowmode(interaction, guild);
			default:
				return interaction.reply({ content: 'Unknown subcommand.', flags: MessageFlags.Ephemeral });
		}
	}

	private async nuke(interaction: Command.ChatInputCommandInteraction, guild: NonNullable<Command.ChatInputCommandInteraction['guild']>) {
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
			return interaction.reply({ content: 'You need the Ban Members permission.', flags: MessageFlags.Ephemeral });
		}
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const target = interaction.options.getUser('user', true);
		const reason = interaction.options.getString('reason') ?? 'No reason provided';
		const days = interaction.options.getInteger('days') ?? 0;

		try {
			await guild.members.ban(target.id, { reason, deleteMessageSeconds: days * 86_400 });
			suppressNext(guild.id, 'mod.ban', target.id);
			suppressNext(guild.id, 'member.leave', target.id);
		} catch {
			return interaction.editReply(`Could not ban <@${target.id}>.`);
		}

		// Delete what they left behind (bulkDelete only takes messages under 14 days).
		let deleted = 0;
		let failed = 0;
		const channels = [...guild.channels.cache.values()].filter((c) => c.isTextBased() && !c.isThread());
		for (const channel of channels) {
			if (!channel.isTextBased() || !('bulkDelete' in channel)) continue;
			try {
				const messages = await channel.messages.fetch({ limit: 100 });
				const theirs = messages.filter((m) => m.author.id === target.id);
				if (theirs.size === 0) continue;
				deleted += (await channel.bulkDelete(theirs, true)).size;
			} catch {
				failed += 1;
			}
		}

		void sendLog(guild, 'mod.ban', {
			description: `**${target.username}** (<@${target.id}>) was nuked by **${interaction.user.tag}** (<@${interaction.user.id}>).`,
			fields: [
				{ name: 'Reason', value: reason.slice(0, 1024) },
				{ name: 'Messages deleted', value: `${deleted} (${failed} channel${failed === 1 ? '' : 's'} failed)`, inline: true }
			],
			actorId: interaction.user.id,
			targetId: target.id,
			isBot: target.bot
		});

		return interaction.editReply(`Nuked <@${target.id}> — banned and deleted ${deleted} message${deleted === 1 ? '' : 's'}${failed ? `; ${failed} channel${failed === 1 ? '' : 's'} could not be cleaned` : ''}.`);
	}

	private async clone(interaction: Command.ChatInputCommandInteraction, guild: NonNullable<Command.ChatInputCommandInteraction['guild']>) {
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
			return interaction.reply({ content: 'You need the Manage Channels permission.', flags: MessageFlags.Ephemeral });
		}
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const channel = interaction.options.getChannel('channel', true);
		const name = interaction.options.getString('name') ?? `${channel.name} copy`;
		if (!('clone' in channel) || typeof channel.clone !== 'function') {
			return interaction.editReply('That channel type cannot be duplicated.');
		}
		try {
			const copy = await channel.clone({ name, reason: `Cloned by ${interaction.user.tag}` });
			return interaction.editReply(`Cloned to ${copy}. Overwrites and settings were copied.`);
		} catch (error) {
			this.container.logger.error('Error cloning channel:', error);
			return interaction.editReply('Could not clone that channel.');
		}
	}

	private async lockdown(interaction: Command.ChatInputCommandInteraction, guild: NonNullable<Command.ChatInputCommandInteraction['guild']>) {
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles) || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
			return interaction.reply({ content: 'You need Manage Channels and Manage Roles.', flags: MessageFlags.Ephemeral });
		}
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const reason = interaction.options.getString('reason') ?? 'Lockdown';
		const durationMs = parseDuration(interaction.options.getString('time'));
		if (interaction.options.getString('time') && durationMs === 0) {
			return interaction.editReply('Could not read that duration. Try `30m`, `2h` or `8h`.');
		}

		const results = await ChannelLockService.lockAll(guild, {
			by: interaction.user.id,
			byTag: interaction.user.tag,
			reason,
			durationMs: durationMs || undefined
		});
		const done = results.filter((r) => r.ok).length;
		const skipped = results.length - done;
		void sendLog(guild, 'channel.update', {
			description: `**${interaction.user.tag}** locked ${done} channel${done === 1 ? '' : 's'}.`,
			fields: [
				{ name: 'Reason', value: reason.slice(0, 1024) },
				{ name: 'Auto-unlock', value: durationMs ? `<t:${Math.floor((Date.now() + durationMs) / 1000)}:F>` : 'never', inline: true },
				...(skipped ? [{ name: 'Skipped', value: `${skipped} channel(s) the bot cannot edit`, inline: true }] : [])
			],
			actorId: interaction.user.id,
			isBot: false
		}).catch(() => false);
		return interaction.editReply(
			`Locked ${done} channel${done === 1 ? '' : 's'}${skipped ? `, skipped ${skipped}` : ''}${durationMs ? ` — auto-unlocking in <t:${Math.floor((Date.now() + durationMs) / 1000)}:R>` : ''}.`
		);
	}

	private async unlockAll(interaction: Command.ChatInputCommandInteraction, guild: NonNullable<Command.ChatInputCommandInteraction['guild']>) {
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
			return interaction.reply({ content: 'You need the Manage Roles permission.', flags: MessageFlags.Ephemeral });
		}
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const done = await ChannelLockService.unlockAll(guild);
		void sendLog(guild, 'channel.update', {
			description: `**${interaction.user.tag}** unlocked ${done} channel${done === 1 ? '' : 's'}.`,
			actorId: interaction.user.id,
			isBot: false
		}).catch(() => false);
		return interaction.editReply(done ? `Unlocked ${done} channel${done === 1 ? '' : 's'}.` : 'No Helix locks were active.');
	}

	private async slowmode(interaction: Command.ChatInputCommandInteraction, guild: NonNullable<Command.ChatInputCommandInteraction['guild']>) {
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
			return interaction.reply({ content: 'You need the Manage Channels permission.', flags: MessageFlags.Ephemeral });
		}
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const seconds = SLOWMODE_PRESETS[interaction.options.getString('preset', true)] ?? 0;
		const channel = interaction.options.getChannel('channel');
		const targets = channel ? [channel] : [...guild.channels.cache.values()].filter((c) => c.type === ChannelType.GuildText);

		let done = 0;
		for (const target of targets) {
			if (!('setRateLimitPerUser' in target)) continue;
			try {
				await (target as { setRateLimitPerUser: (s: number, r?: string) => Promise<unknown> }).setRateLimitPerUser(seconds, `Slowmode preset by ${interaction.user.tag}`);
				done += 1;
			} catch {
				// channel we cannot edit
			}
		}
		return interaction.editReply(
			seconds > 0 ? `Slowmode set to ${seconds}s in ${done} channel${done === 1 ? '' : 's'}.` : `Slowmode disabled in ${done} channel${done === 1 ? '' : 's'}.`
		);
	}
}
