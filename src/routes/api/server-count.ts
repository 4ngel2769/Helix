import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { setPublicApiHeaders } from '../../lib/utils/publicApiCors';
import { UptimeService } from '../../lib/services/UptimeService';

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

@ApplyOptions<RouteOptions>({
    // Without an explicit name the piece inherits `api/server-count` from its
    // file path, which the plugin mounts under the `/api` prefix — producing
    // the accidental `/api/api/server-count` URL. Pin it to `/api/server-count`.
    route: 'server-count',
    methods: ['GET', 'OPTIONS']
})
export class ServerCountRoute extends Route {
    public override async run(_request: ApiRequest, response: ApiResponse) {
        // Public counters — the website fetches this cross-origin for its stats.
        setPublicApiHeaders(response);

        const client = this.container.client as {
            guilds: { cache: Map<string, { memberCount: number }> };
            users: { cache: Map<string, unknown> };
            uptime: number;
        };

        // "Users reached" = sum of member counts across every guild the bot
        // is in — NOT client.users.cache, which only holds users the bot has
        // recently interacted with.
        let members = 0;
        for (const guild of client.guilds.cache.values()) members += guild.memberCount ?? 0;

        const [uptime24h, uptime7d, uptime30d, uptimeDataSince] = await Promise.all([
            UptimeService.uptimePercent(DAY),
            UptimeService.uptimePercent(WEEK),
            UptimeService.uptimePercent(MONTH),
            UptimeService.dataSince()
        ]);

        return response.json({
            guilds: client.guilds.cache.size,
            members,
            users: client.users.cache.size,
            uptime: client.uptime,
            uptimeDataSince,
            uptimePercent: {
                '24h': uptime24h,
                '7d': uptime7d,
                '30d': uptime30d
            }
        });
    }
}
