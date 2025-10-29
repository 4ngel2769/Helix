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
        console.log('🔐 [CALLBACK] OAuth callback endpoint called');
        console.log(`🔐 [CALLBACK] Query params:`, request.query);
        
        const code = request.query.code as string;

        if (!code) {
            console.log('❌ [CALLBACK] No authorization code provided');
            return response.status(HttpCodes.BadRequest).json({
                success: false,
                error: 'No authorization code provided'
            });
        }

        try {
            console.log('🔐 [CALLBACK] Exchanging code for access token...');
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

            console.log('✅ [CALLBACK] Token received, setting cookie');
            console.log(`🍪 [CALLBACK] Cookie name: ${config.api.auth.cookie}`);
            console.log(`🍪 [CALLBACK] Cookie max age: ${expires_in} seconds`);

            // Set cookie manually in response headers
            const maxAge = expires_in * 1000;
            const cookieValue = `${config.api.auth.cookie}=${access_token}; Max-Age=${maxAge / 1000}; Path=/; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''} SameSite=Lax`;
            
            response.setHeader('Set-Cookie', cookieValue);

            const redirectUrl = `${config.dashboard.domain}:${config.dashboard.port}/dashboard`;
            console.log(`↩️  [CALLBACK] Redirecting to: ${redirectUrl}`);

            // Redirect to dashboard using HTML meta refresh
            return response.text(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta http-equiv="refresh" content="0; url=${redirectUrl}">
                </head>
                <body>
                    <p>Redirecting to dashboard...</p>
                </body>
                </html>
            `);
        } catch (error) {
            console.error('❌ [CALLBACK] OAuth callback error:', error);
            return response.status(HttpCodes.InternalServerError).json({
                success: false,
                error: 'Failed to authenticate'
            });
        }
    }
}
