import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';

@ApplyOptions<RouteOptions>({
    methods: ['GET']
})
export class ServerCountRoute extends Route {
    public override run(_request: ApiRequest, response: ApiResponse) {
        return response.json({
            guilds: this.container.client.guilds.cache.size,
            users: this.container.client.users.cache.size,
            uptime: this.container.client.uptime
        });
    }
}
