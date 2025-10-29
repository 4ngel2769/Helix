import { Route } from '../../lib/structures/Route';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse, RouteOptions } from '@sapphire/plugin-api';
import config from '../../config';

@ApplyOptions<RouteOptions>({
    route: 'auth/logout'
})
export class LogoutRoute extends Route {
    public override run(_request: ApiRequest, response: ApiResponse) {
        // Clear the authentication cookie
        const cookieValue = `${config.api.auth.cookie}=; Max-Age=0; Path=/; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''} SameSite=Lax`;
        response.setHeader('Set-Cookie', cookieValue);

        return response.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
}
