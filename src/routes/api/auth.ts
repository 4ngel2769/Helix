import { Route } from '../../lib/structures/Route';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse, RouteOptions } from '@sapphire/plugin-api';
import { OAuth2Scopes } from 'discord.js';
import config from '../../config';

@ApplyOptions<RouteOptions>({
    route: 'auth/login'
})
export class AuthRoute extends Route {
    public override run(_request: ApiRequest, response: ApiResponse) {
        console.log('🔐 [AUTH] Login endpoint called');
        console.log(`🔐 [AUTH] Client ID: ${config.dashboard.oauth.clientId}`);
        console.log(`🔐 [AUTH] Redirect URI: ${config.api.auth.domain}${config.api.auth.redirect}`);
        
        // Generate Discord OAuth2 URL
        const params = new URLSearchParams({
            client_id: config.dashboard.oauth.clientId,
            redirect_uri: `${config.api.auth.domain}${config.api.auth.redirect}`,
            response_type: 'code',
            scope: [OAuth2Scopes.Identify, OAuth2Scopes.Guilds].join(' ')
        });

        const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
        
        console.log(`🔐 [AUTH] Generated OAuth URL: ${authUrl}`);
        
        return response.json({
            success: true,
            url: authUrl
        });
    }
}
