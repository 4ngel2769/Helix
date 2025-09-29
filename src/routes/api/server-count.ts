import { Route } from '@sapphire/plugin-api';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';

export class ServerCountRoute extends Route {
    public override run(_request: ApiRequest, response: ApiResponse) {
        return response.json({
            guilds: this.container.client.guilds.cache.size,
            users: this.container.client.users.cache.size,
            uptime: this.container.client.uptime
        });
    }
}
