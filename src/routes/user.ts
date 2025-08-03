import { Route, ApplyOptions, methods } from '@sapphire/plugin-api';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';

@ApplyOptions<Route.Options>({
    route: 'users/@me'
})
export class UserRoute extends Route {
    public [methods.GET](request: ApiRequest, response: ApiResponse) {
        if (!request.auth) {
            return response.status(401).json({ error: 'Unauthorized' });
        }
        return response.json(request.auth);
    }
}
