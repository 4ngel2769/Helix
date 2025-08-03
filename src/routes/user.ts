import { Route } from '@sapphire/framework';
import { ApiRequest, ApiResponse, HttpCodes } from '@sapphire/plugin-api';

export class UserRoute extends Route {
    public constructor(context: Route.LoaderContext, options: Route.Options) {
        super(context, {
            ...options,
            route: 'users/@me',
        });
    }

    public get(request: ApiRequest, response: ApiResponse) {
        if (!request.auth) {
            return response.status(HttpCodes.Unauthorized).json({ error: 'Unauthorized' });
        }
        return response.json(request.auth);
    }
}
