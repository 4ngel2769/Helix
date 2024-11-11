import { Route } from '../lib/structures/Route';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import { HttpCodes } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';

@ApplyOptions<RouteOptions>({
    name: 'auth-login',
    route: 'auth/login'
})
export class AuthLoginRoute extends Route {
    public override async run(_request: ApiRequest, response: ApiResponse) {
        const authUrl = await this.container.client.generateOAuth2AuthUrl();
        return response.redirect(authUrl);
    }
}

@ApplyOptions<RouteOptions>({
    name: 'auth-callback',
    route: 'auth/callback'
})
export class AuthCallbackRoute extends Route {
    public override async run(request: ApiRequest, response: ApiResponse) {
        try {
            const { code } = request.query;
            if (!code || typeof code !== 'string') {
                return response.status(HttpCodes.BadRequest).json({
                    error: 'Invalid authorization code'
                });
            }

            const oauthData = await this.container.client.generateOAuth2Token(code);
            if (!oauthData) {
                return response.status(HttpCodes.BadRequest).json({
                    error: 'Failed to generate token'
                });
            }

            request.auth = {
                token: oauthData.access_token,
                refresh: oauthData.refresh_token,
                expires: new Date(Date.now() + oauthData.expires_in * 1000)
            };

            return response.redirect('/dashboard');
        } catch (error) {
            this.container.logger.error(error);
            return response.redirect('/?error=auth_failed');
        }
    }
} 