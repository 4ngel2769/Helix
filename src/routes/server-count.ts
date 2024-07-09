import { methods, Route, type ApiRequest, type ApiResponse } from '@sapphire/plugin-api';

export class ServerCountRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'server-count'
    });
  }

  public [methods.GET](_request: ApiRequest, response: ApiResponse) {
    const serverCount = this.container.client.guilds.cache.size;
    response.json({ serverCount });
  }
}
