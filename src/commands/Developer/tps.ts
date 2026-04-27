import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, Message, ColorResolvable, MessageFlags } from 'discord.js';
import config from '../../config';
import { TPSMonitor } from '../../lib/services/TPSMonitor';

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
	name: 'tps',
	description: 'Shows the current TPS (Ticks Per Second) of the bot',
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
		registry.registerChatInputCommand((builder) => builder.setName('tps').setDescription('Shows the current TPS (Ticks Per Second) of the bot'));
	}

	private async sendTPSEmbed(interaction: Message | Command.ChatInputCommandInteraction) {
		const tpsMonitor = TPSMonitor.getInstance();
		const tps1m = tpsMonitor.getTPS(60);
		const tps5m = tpsMonitor.getTPS(300);
		const tps15m = tpsMonitor.getTPS(900);
		const loop1m = tpsMonitor.getEventLoopLatency(60);
		const loopP951m = tpsMonitor.getEventLoopP95Latency(60);
		const maxLoop1m = tpsMonitor.getEventLoopMaxLatency(60);
		const memory = tpsMonitor.getMemoryUsage();
		const uptime = tpsMonitor.getUptime();

		const formatValue = (value: number | null, unit = '') =>
			value === null ? 'Collecting...' : `${value}${unit}`;

		const embed = new EmbedBuilder()
			.setColor(config.bot.embedColor.default as ColorResolvable)
			.setTitle('🎯 Bot TPS & Performance')
			.setDescription('Shows the bot\'s event loop and TPS performance over recent intervals.')
			.addFields([
				{
					name: 'Last Minute TPS',
					value: `${tpsMonitor.getTPSColor(tps1m ?? 0)} ${formatValue(tps1m, ' TPS')}`,
					inline: true
				},
				{
					name: 'Last 5 Minutes TPS',
					value: `${tpsMonitor.getTPSColor(tps5m ?? 0)} ${formatValue(tps5m, ' TPS')}`,
					inline: true
				},
				{
					name: 'Last 15 Minutes TPS',
					value: `${tpsMonitor.getTPSColor(tps15m ?? 0)} ${formatValue(tps15m, ' TPS')}`,
					inline: true
				},
				{
					name: 'Event Loop Avg (1m)',
					value: formatValue(loop1m, ' ms'),
					inline: true
				},
				{
					name: 'Event Loop P95 (1m)',
					value: formatValue(loopP951m, ' ms'),
					inline: true
				},
				{
					name: 'Event Loop Max (1m)',
					value: formatValue(maxLoop1m, ' ms'),
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
			.setFooter({ text: 'TPS Status: 🟢 Good (18-20) | 🟡 Warning (15-17) | 🔴 Poor (<15)' })
			.setTimestamp();

		if (interaction instanceof Message) {
			return interaction.reply({ embeds: [embed] });
		}

		return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
	}
}
