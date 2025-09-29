import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, Message, ColorResolvable, MessageFlags } from 'discord.js';
import config from '../../config';

class TPSMonitor {
	private static instance: TPSMonitor;
	private lastTick: number;
	private tpsHistory: number[];
	private readonly targetTPS: number = 20;
	private readonly historyLength: number = 60;

	private constructor() {
		this.lastTick = Date.now();
		this.tpsHistory = [];
		this.startTicking();
	}

	public static getInstance(): TPSMonitor {
		if (!TPSMonitor.instance) {
			TPSMonitor.instance = new TPSMonitor();
		}
		return TPSMonitor.instance;
	}

	private startTicking(): void {
		setInterval(() => {
			const now = Date.now();
			const elapsed = now - this.lastTick;
			const currentTPS = 1000 / elapsed;

			this.tpsHistory.push(Math.min(currentTPS, this.targetTPS));
			if (this.tpsHistory.length > this.historyLength) {
				this.tpsHistory.shift();
			}

			this.lastTick = now;
		}, 1000 / this.targetTPS);
	}

	public getTPS(duration: number = 60): number {
		const relevantHistory = this.tpsHistory.slice(-Math.min(duration, this.historyLength));
		const average = relevantHistory.reduce((a, b) => a + b, 0) / relevantHistory.length;
		return Math.round(average * 100) / 100;
	}

	public getTPSColor(tps: number): string {
		if (tps >= 18) return '🟢';
		if (tps >= 15) return '🟡';
		return '🔴';
	}
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

		const embed = new EmbedBuilder()
			.setColor(config.bot.embedColor.default as ColorResolvable)
			.setTitle('🎯 Bot TPS (Ticks Per Second)')
			.setDescription('Shows how many ticks per second the bot is processing.\nOptimal TPS: 20')
			.addFields([
				{
					name: 'Last Minute',
					value: `${tpsMonitor.getTPSColor(tps1m)} ${tps1m} TPS`,
					inline: true
				},
				{
					name: 'Last 5 Minutes',
					value: `${tpsMonitor.getTPSColor(tps5m)} ${tps5m} TPS`,
					inline: true
				},
				{
					name: 'Last 15 Minutes',
					value: `${tpsMonitor.getTPSColor(tps15m)} ${tps15m} TPS`,
					inline: true
				}
			])
			.setFooter({ text: 'TPS Status: 🟢 Good (18-20) | 🟡 Warning (15-17) | 🔴 Poor (<15)' })
			.setTimestamp();

		if (interaction instanceof Message) {
			return interaction.reply({ embeds: [embed] });
		} else {
			return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		}
	}
}
