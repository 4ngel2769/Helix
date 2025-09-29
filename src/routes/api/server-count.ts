import { Route } from '@sapphire/plugin-api';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';

export class ServerCountRoute extends Route {
    public run(_request: ApiRequest, response: ApiResponse) {
        const serverCount = this.container.client.guilds.cache.size;
        const moduleCount = this.container.client.modules?.size ?? 0;
        return response.json({
            servers: serverCount,
            modules: moduleCount,
            uptime: this.container.client.uptime
        });
    }
}
