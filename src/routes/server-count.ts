import { Route } from '../lib/structures/Route';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';

@ApplyOptions<RouteOptions>({
    name: 'server-count',
    route: 'server-count'
})
export class ServerCountRoute extends Route {
    public override run(_request: ApiRequest, response: ApiResponse) {
        const serverCount = this.container.client.guilds.cache.size;
        const moduleCount = this.container.client.modules.size;
        
        return response.json({ 
            servers: serverCount,
            modules: moduleCount,
            uptime: this.container.client.uptime
        });
    }
}
