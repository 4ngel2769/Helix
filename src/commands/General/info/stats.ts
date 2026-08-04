import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
	EmbedBuilder,
	type ColorResolvable,
	type Message,
	version as discordJsVersion,
	ChannelType
} from 'discord.js';
import { PerformanceMonitor } from '../../../lib/services/TPSMonitor';
import config from '../../../config';

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const index = Math.floor(Math.log(bytes) / Math.log(1024));
	const value = bytes / Math.pow(1024, index);
	return `${value.toFixed(1)} ${units[index]}`;
}

function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);
	const parts: string[] = [];
	if (days) parts.push(`${days}d`);
	if (hours) parts.push(`${hours}h`);
	if (mins) parts.push(`${mins}m`);
	parts.push(`${secs}s`);
	return parts.join(' ');
}

function pingBar(ms: number | null): string {
	if (ms === null) return '⚪';
	if (ms < 50) return '🟢';
	if (ms < 150) return '🟡';
	return '🔴';
}

@ApplyOptions<Command.Options>({
	name: 'stats',
	description: 'Show bot statistics and performance metrics',
	aliases: ['statistics', 'metrics'],
	fullCategory: ['General'],
	enabled: true,
	flags: true,
	cooldownDelay: 5000,
	cooldownLimit: 3,
	cooldownFilteredUsers: (process.env.OWNER_IDS || '').split(',').filter(Boolean)
})
export class StatsCommand extends ModuleCommand<GeneralModule> {
	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, {
			...options,
			module: 'General',
			description: 'Show bot statistics and performance metrics',
			enabled: true,
			preconditions: ['ModuleEnabled']
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setIntegrationTypes(0, 1)
				.setContexts(0, 1, 2)
		);
	}

	public override async messageRun(message: Message) {
		const embed = this.buildStatsEmbed(message.client);
		return message.reply({ embeds: [embed] });
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		await interaction.deferReply();
		const embed = this.buildStatsEmbed(interaction.client);
		return interaction.editReply({ embeds: [embed] });
	}

	private buildStatsEmbed(client: import('discord.js').Client) {
		const memory = process.memoryUsage();
		const monitor = PerformanceMonitor.getInstance();
		const eventLoop = monitor.getEventLoopLatency(60);

		// Counts
		const guilds = client.guilds.cache.size;
		const users = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
		const channels = client.channels.cache.size;
		const textChannels = client.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
		const voiceChannels = client.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;

		// Shard info
		const shardCount = client.shard?.count ?? 1;
		const shardId = client.shard?.ids[0] ?? 0;

		const embed = new EmbedBuilder()
			.setColor(config.bot.embedColor.default as ColorResolvable)
			.setTitle('Helix Statistics')
			.setDescription('Real-time metrics and system overview')
			.addFields(
				{
					name: 'Overview',
					value: [
						`> Servers **${guilds.toLocaleString()}**`,
						`> Users **${users.toLocaleString()}**`,
						`> Channels **${channels.toLocaleString()}**`,
						`> └ Text **${textChannels}** · Voice **${voiceChannels}**`
					].join('\n'),
					inline: true
				},
				{
					name: 'Performance',
					value: [
						`${pingBar(client.ws.ping)} WebSocket **${client.ws.ping}ms**`,
						`${pingBar(eventLoop)} Event Loop **${eventLoop !== null ? eventLoop.toFixed(1) : '...'}ms**`,
						`📊 Heap **${formatBytes(memory.heapUsed)}** / ${formatBytes(memory.heapTotal)}`,
						`📦 RSS **${formatBytes(memory.rss)}**`
					].join('\n'),
					inline: true
				},
				{
					name: 'Runtime',
					value: [
						`⏱️ Uptime **${formatUptime(process.uptime())}**`,
						`🟢 Node **${process.version}**`,
						`🤖 discord.js **v${discordJsVersion}**`,
						`🏷️ Version **v${config.bot.version}**`
					].join('\n'),
					inline: true
				}
			)
			.setFooter({
				text: shardCount > 1 ? `Shard ${shardId + 1} / ${shardCount} · ${process.platform}` : process.platform
			})
			.setTimestamp();

		return embed;
	}
}
