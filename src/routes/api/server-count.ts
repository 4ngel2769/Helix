import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { setPublicApiHeaders } from '../../lib/utils/publicApiCors';

@ApplyOptions<RouteOptions>({
    // Without an explicit name the piece inherits `api/server-count` from its
    // file path, which the plugin mounts under the `/api` prefix — producing
    // the accidental `/api/api/server-count` URL. Pin it to `/api/server-count`.
    route: 'server-count',
    methods: ['GET']
})
export class ServerCountRoute extends Route {
    public override run(_request: ApiRequest, response: ApiResponse) {
        // Public counters — the website fetches this cross-origin for its stats.
        setPublicApiHeaders(response);

        return response.json({
            guilds: this.container.client.guilds.cache.size,
            users: this.container.client.users.cache.size,
            uptime: this.container.client.uptime
        });
    }
}
