import { monitorEventLoopDelay } from 'perf_hooks';
import type { SapphireClient } from '@sapphire/framework';

export interface PerformanceMetrics {
	eventRate: number;
	messageRate: number;
	interactionRate: number;
	averageEventLoopLatencyMs: number;
	maxEventLoopLatencyMs: number;
	p95EventLoopLatencyMs: number;
	memoryUsage: NodeJS.MemoryUsage;
	uptimeSeconds: number;
}

export class PerformanceMonitor {
	private static instance: PerformanceMonitor | null = null;
	private readonly summaryIntervalMs = 1000;
	private readonly historyLength = 900;

	private readonly histogram = monitorEventLoopDelay({ resolution: 10 });
	private readonly eventHistory: number[] = [];
	private readonly messageHistory: number[] = [];
	private readonly interactionHistory: number[] = [];
	private readonly eventLoopAvgHistory: number[] = [];
	private readonly eventLoopMaxHistory: number[] = [];
	private readonly eventLoopP95History: number[] = [];

	private currentEvents = 0;
	private currentMessages = 0;
	private currentInteractions = 0;
	private summaryInterval: NodeJS.Timeout | null = null;

	private constructor(client: SapphireClient) {
		this.histogram.enable();
		this.attachClientListeners(client);
		this.startSummaries();
	}

	public static getInstance(client?: SapphireClient): PerformanceMonitor {
		if (!this.instance) {
			if (!client) {
				throw new Error('PerformanceMonitor must be initialized with a client.');
			}
			this.instance = new PerformanceMonitor(client);
		}
		return this.instance;
	}

	private attachClientListeners(client: SapphireClient): void {
		client.on('messageCreate', () => {
			this.currentEvents++;
			this.currentMessages++;
		});

		client.on('interactionCreate', () => {
			this.currentEvents++;
			this.currentInteractions++;
		});
	}

	private startSummaries(): void {
		this.summaryInterval = setInterval(() => {
			this.pushHistory(this.eventHistory, this.currentEvents);
			this.pushHistory(this.messageHistory, this.currentMessages);
			this.pushHistory(this.interactionHistory, this.currentInteractions);

			this.currentEvents = 0;
			this.currentMessages = 0;
			this.currentInteractions = 0;

			this.pushHistory(this.eventLoopAvgHistory, this.nsToMs(this.histogram.mean));
			this.pushHistory(this.eventLoopMaxHistory, this.nsToMs(this.histogram.max));
			this.pushHistory(this.eventLoopP95History, this.nsToMs(this.histogram.percentile(95)));
			this.histogram.reset();
		}, this.summaryIntervalMs);

		this.summaryInterval.unref();
	}

	private average(values: number[]): number {
		return values.reduce((acc, value) => acc + value, 0) / values.length;
	}

	private pushHistory(history: number[], value: number): void {
		history.push(Math.round(value * 100) / 100);
		if (history.length > this.historyLength) {
			history.shift();
		}
	}

	private nsToMs(value: number | bigint): number {
		return Number(value) / 1_000_000;
	}

	private getHistorySlice(history: number[], duration: number): number[] {
		return history.slice(-Math.min(duration, history.length));
	}

	public getEventRate(duration: number = 60): number | null {
		const relevantHistory = this.getHistorySlice(this.eventHistory, duration);
		if (relevantHistory.length === 0) return null;
		return Math.round(this.average(relevantHistory) * 100) / 100;
	}

	public getMessageRate(duration: number = 60): number | null {
		const relevantHistory = this.getHistorySlice(this.messageHistory, duration);
		if (relevantHistory.length === 0) return null;
		return Math.round(this.average(relevantHistory) * 100) / 100;
	}

	public getInteractionRate(duration: number = 60): number | null {
		const relevantHistory = this.getHistorySlice(this.interactionHistory, duration);
		if (relevantHistory.length === 0) return null;
		return Math.round(this.average(relevantHistory) * 100) / 100;
	}

	public getEventLoopLatency(duration: number = 60): number | null {
		const relevantHistory = this.getHistorySlice(this.eventLoopAvgHistory, duration);
		if (relevantHistory.length === 0) return null;
		return Math.round(this.average(relevantHistory) * 100) / 100;
	}

	public getEventLoopMaxLatency(duration: number = 60): number | null {
		const relevantHistory = this.getHistorySlice(this.eventLoopMaxHistory, duration);
		if (relevantHistory.length === 0) return null;
		return Math.round(Math.max(...relevantHistory) * 100) / 100;
	}

	public getEventLoopP95Latency(duration: number = 60): number | null {
		const relevantHistory = this.getHistorySlice(this.eventLoopP95History, duration);
		if (relevantHistory.length === 0) return null;
		return Math.round(this.average(relevantHistory) * 100) / 100;
	}

	public getMemoryUsage(): NodeJS.MemoryUsage {
		return process.memoryUsage();
	}

	public getUptime(): number {
		return Math.round(process.uptime());
	}

	public getLatencyStatus(latency: number | null): string {
		if (latency === null) return '⚪ Collecting';
		if (latency < 20) return '🟢';
		if (latency < 50) return '🟡';
		return '🔴';
	}

	public cleanup(): void {
		if (this.summaryInterval) {
			clearInterval(this.summaryInterval);
			this.summaryInterval = null;
		}

		this.histogram.disable();
	}
}

export function initializePerformanceMonitor(client: SapphireClient): PerformanceMonitor {
	return PerformanceMonitor.getInstance(client);
}
