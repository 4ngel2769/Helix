import { Route } from '../../lib/structures/Route';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse, RouteOptions } from '@sapphire/plugin-api';
import { HttpCodes } from '@sapphire/plugin-api';
import axios from 'axios';
import config from '../../config';

@ApplyOptions<RouteOptions>({
    route: 'auth/callback'
})
export class CallbackRoute extends Route {
    public override async run(request: ApiRequest, response: ApiResponse) {
        const code = request.query.code as string;

        if (!code) {
            return response.status(HttpCodes.BadRequest).json({
                success: false,
                error: 'No authorization code provided'
            });
        }

        try {
            // Exchange code for access token
            const tokenResponse = await axios.post(
                'https://discord.com/api/oauth2/token',
                new URLSearchParams({
                    client_id: config.dashboard.oauth.clientId,
                    client_secret: config.dashboard.oauth.clientSecret,
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: `${config.api.auth.domain}${config.api.auth.redirect}`
                }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            const { access_token, expires_in } = tokenResponse.data;

            // Set cookie manually in response headers
            const maxAge = expires_in * 1000;
            const cookieValue = `${config.api.auth.cookie}=${access_token}; Max-Age=${maxAge / 1000}; Path=/; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''} SameSite=Lax`;
            
            response.setHeader('Set-Cookie', cookieValue);

            // Redirect to dashboard using HTML meta refresh
            return response.text(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta http-equiv="refresh" content="0; url=${config.dashboard.domain}:${config.dashboard.port}/dashboard">
                </head>
                <body>
                    <p>Redirecting to dashboard...</p>
                </body>
                </html>
            `);
        } catch (error) {
            console.error('OAuth callback error:', error);
            return response.status(HttpCodes.InternalServerError).json({
                success: false,
                error: 'Failed to authenticate'
            });
        }
    }
}
