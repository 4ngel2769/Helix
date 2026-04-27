import { monitorEventLoopDelay } from 'perf_hooks';

export interface TPSMetrics {
	averageTPS: number;
	averageEventLoopLatencyMs: number;
	maxEventLoopLatencyMs: number;
	p95EventLoopLatencyMs: number;
	memoryUsage: NodeJS.MemoryUsage;
	uptimeSeconds: number;
}

export class TPSMonitor {
	private static instance: TPSMonitor | null = null;
	private readonly targetTPS = 20;
	private readonly tickIntervalMs = 1000 / this.targetTPS;
	private readonly summaryIntervalMs = 1000;
	private readonly historyLength = 900;

	private readonly histogram = monitorEventLoopDelay({ resolution: 10 });
	private readonly tickSamples: number[] = [];
	private readonly tpsHistory: number[] = [];
	private readonly eventLoopAvgHistory: number[] = [];
	private readonly eventLoopMaxHistory: number[] = [];
	private readonly eventLoopP95History: number[] = [];

	private lastTickTime = performance.now();
	private tickInterval: NodeJS.Timeout | null = null;
	private summaryInterval: NodeJS.Timeout | null = null;

	private constructor() {
		this.histogram.enable();
		this.startTicking();
		this.startSummaries();
	}

	public static getInstance(): TPSMonitor {
		if (!this.instance) {
			this.instance = new TPSMonitor();
		}
		return this.instance;
	}

	private startTicking(): void {
		this.tickInterval = setInterval(() => {
			const now = performance.now();
			const elapsed = now - this.lastTickTime;
			const currentTPS = elapsed > 0 ? Math.min(1000 / elapsed, this.targetTPS) : this.targetTPS;

			this.tickSamples.push(currentTPS);
			if (this.tickSamples.length > 100) {
				this.tickSamples.shift();
			}

			this.lastTickTime = now;
		}, this.tickIntervalMs);

		this.tickInterval.unref();
	}

	private startSummaries(): void {
		this.summaryInterval = setInterval(() => {
			if (this.tickSamples.length > 0) {
				const averageTPS = this.average(this.tickSamples);
				this.pushHistory(this.tpsHistory, averageTPS);
				this.tickSamples.length = 0;
			}

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

	public getTPS(duration: number = 60): number | null {
		const relevantHistory = this.getHistorySlice(this.tpsHistory, duration);
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

	public getTPSColor(tps: number): string {
		if (tps >= 18) return '🟢';
		if (tps >= 15) return '🟡';
		return '🔴';
	}

	private getHistorySlice(history: number[], duration: number): number[] {
		return history.slice(-Math.min(duration, history.length));
	}

	public cleanup(): void {
		if (this.tickInterval) {
			clearInterval(this.tickInterval);
			this.tickInterval = null;
		}

		if (this.summaryInterval) {
			clearInterval(this.summaryInterval);
			this.summaryInterval = null;
		}

		this.histogram.disable();
	}
}

export function initializeTPSMonitor(): TPSMonitor {
	return TPSMonitor.getInstance();
}
