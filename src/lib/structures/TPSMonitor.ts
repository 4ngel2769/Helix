export class TPSMonitor {
    private static instance: TPSMonitor;
    private lastTick: number;
    private tpsHistory: number[];
    private readonly targetTPS: number = 20;
    private readonly historyLength: number = 60; // Keep 1 minute of history

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
            const diff = now - this.lastTick;
            const currentTPS = Math.min(1000 / diff * this.targetTPS, this.targetTPS);
            
            this.tpsHistory.push(currentTPS);
            if (this.tpsHistory.length > this.historyLength) {
                this.tpsHistory.shift();
            }
            
            this.lastTick = now;
        }, 1000 / this.targetTPS); // Tick every 50ms (20 TPS)
    }

    public getTPS(duration: number = 60): number {
        const relevantHistory = this.tpsHistory.slice(-Math.min(duration, this.historyLength));
        const average = relevantHistory.reduce((a, b) => a + b, 0) / relevantHistory.length;
        return Math.round(average * 100) / 100; // Round to 2 decimal places
    }

    public getTPSColor(tps: number): string {
        if (tps >= 18) return '🟢';
        if (tps >= 15) return '🟡';
        return '🔴';
    }
}