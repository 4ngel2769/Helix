import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { version } from '../../../package.json';
import { setPublicApiHeaders } from '../../lib/utils/publicApiCors';
import { UptimeService } from '../../lib/services/UptimeService';

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

@ApplyOptions<RouteOptions>({
	name: 'api-health',
	route: 'health',
	methods: ['GET', 'OPTIONS']
})
export class ApiHealthRoute extends Route {
	/** Set once the dashboard handshake has been acknowledged (avoids log spam). */
	private hookLogged = false;

	public override async run(request: ApiRequest, response: ApiResponse) {
		// Public read-only endpoint — the website's /status page fetches it
		// cross-origin. Open CORS like /api/guilds.
		setPublicApiHeaders(response);

		const headers = (request as unknown as { headers?: Record<string, unknown> }).headers;
		const hook = headers?.['x-helix-dashboard'];
		if (typeof hook === 'string' && hook.length > 0 && !this.hookLogged) {
			this.hookLogged = true;
			this.container.logger.info(`Dashboard linked (${hook})`);
		}

		let database = 'unknown';
		try {
			const mongoose = (await import('mongoose')).default;
			database = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
		} catch {
			database = 'unknown';
		}

		const client = this.container.client as {
			uptime: number;
			guilds: { cache: Map<string, { memberCount: number }> };
			ws: { shards: Map<unknown, unknown> };
			stores?: { get?: (name: string) => Map<unknown, unknown> | undefined };
		};

		let members = 0;
		try {
			for (const guild of client.guilds.cache.values()) members += guild.memberCount ?? 0;
		} catch {
			// partial cache — report what we have
		}

		let commands = 0;
		try {
			commands = client.stores?.get?.('commands')?.size ?? 0;
		} catch {
			// ignore
		}

		const [uptime24h, uptime7d, uptime30d, session, uptimeDataSince] = await Promise.all([
			UptimeService.uptimePercent(DAY),
			UptimeService.uptimePercent(WEEK),
			UptimeService.uptimePercent(MONTH),
			UptimeService.currentSession(),
			UptimeService.dataSince()
		]);

		return response.json({
			status: 'ok',
			version,
			uptimeSeconds: Math.floor((client.uptime ?? 0) / 1000),
			guilds: client.guilds.cache.size,
			members,
			shards: client.ws?.shards?.size ?? 1,
			commands,
			database,
			uptimeDataSince,
			uptimePercent: {
				'24h': uptime24h,
				'7d': uptime7d,
				'30d': uptime30d
			},
			session: session
				? {
						startedAt: session.startedAt.toISOString(),
						lastHeartbeatAt: session.lastHeartbeatAt.toISOString(),
						clientUptimeMs: session.clientUptimeMs
					}
				: null,
			timestamp: new Date().toISOString()
		});
	}
}
