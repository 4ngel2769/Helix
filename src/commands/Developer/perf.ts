import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, Message, ColorResolvable, MessageFlags } from 'discord.js';
import config from '../../config';
import { PerformanceMonitor } from '../../lib/services/TPSMonitor';

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const index = Math.floor(Math.log(bytes) / Math.log(1024));
	const value = bytes / Math.pow(1024, index);
	return `${value.toFixed(2)} ${units[index]}`;
}

function formatUptime(seconds: number): string {
	const hrs = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;
	return `${hrs}h ${mins}m ${secs}s`;
}

@ApplyOptions<Command.Options>({
	name: 'perf',
	description: 'Shows current bot performance metrics and event-loop latency',
	preconditions: ['OwnerOnly']
})
export class TPSCommand extends Command {
	public override async messageRun(message: Message) {
		await this.sendTPSEmbed(message);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		await this.sendTPSEmbed(interaction);
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName('perf').setDescription('Shows current bot performance metrics and event-loop latency'));
	}

	private async sendTPSEmbed(interaction: Message | Command.ChatInputCommandInteraction) {
		const monitor = PerformanceMonitor.getInstance();
		const eventRate1m = monitor.getEventRate(60);
		const messageRate1m = monitor.getMessageRate(60);
		const interactionRate1m = monitor.getInteractionRate(60);
		const loop1m = monitor.getEventLoopLatency(60);
		const loopP951m = monitor.getEventLoopP95Latency(60);
		const maxLoop1m = monitor.getEventLoopMaxLatency(60);
		const memory = monitor.getMemoryUsage();
		const uptime = monitor.getUptime();

		const formatValue = (value: number | null, unit = '') =>
			value === null ? 'Collecting...' : `${value}${unit}`;

		const embed = new EmbedBuilder()
			.setColor(config.bot.embedColor.default as ColorResolvable)
			.setTitle('🎯 Bot Performance')
			.setDescription('Shows the bot\'s event throughput and event-loop latency over recent intervals.')
			.addFields([
				{
					name: 'Event Rate (1m)',
					value: formatValue(eventRate1m, ' events/s'),
					inline: true
				},
				{
					name: 'Message Rate (1m)',
					value: formatValue(messageRate1m, ' msgs/s'),
					inline: true
				},
				{
					name: 'Interaction Rate (1m)',
					value: formatValue(interactionRate1m, ' interactions/s'),
					inline: true
				},
				{
					name: 'Event Loop Avg (1m)',
					value: `${monitor.getLatencyStatus(loop1m)} ${formatValue(loop1m, ' ms')}`,
					inline: true
				},
				{
					name: 'Event Loop P95 (1m)',
					value: `${monitor.getLatencyStatus(loopP951m)} ${formatValue(loopP951m, ' ms')}`,
					inline: true
				},
				{
					name: 'Event Loop Max (1m)',
					value: `${monitor.getLatencyStatus(maxLoop1m)} ${formatValue(maxLoop1m, ' ms')}`,
					inline: true
				},
				{
					name: 'Heap Used',
					value: formatBytes(memory.heapUsed),
					inline: true
				},
				{
					name: 'Uptime',
					value: formatUptime(uptime),
					inline: true
				}
			])
			.setFooter({ text: 'Latency Status: 🟢 <20ms | 🟡 20-50ms | 🔴 >50ms' })
			.setTimestamp();

		if (interaction instanceof Message) {
			return interaction.reply({ embeds: [embed] });
		}

		return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
	}
}
