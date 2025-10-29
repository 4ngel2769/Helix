import { Route } from '../../lib/structures/Route';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse, RouteOptions } from '@sapphire/plugin-api';
import { HttpCodes } from '@sapphire/plugin-api';
import axios from 'axios';
import config from '../../config';

@ApplyOptions<RouteOptions>({
    route: 'user'
})
export class UserRoute extends Route {
    public override async run(request: ApiRequest, response: ApiResponse) {
        // Get token from cookies header
        const token = this.getTokenFromRequest(request);

        if (!token) {
            return response.status(HttpCodes.Unauthorized).json({
                success: false,
                error: 'Not authenticated'
            });
        }

        try {
            // Fetch user information from Discord
            const userResponse = await axios.get('https://discord.com/api/users/@me', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const user = userResponse.data;

            return response.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    discriminator: user.discriminator,
                    avatar: user.avatar,
                    avatarUrl: user.avatar
                        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator || '0') % 5}.png`
                }
            });
        } catch (error) {
            console.error('Failed to fetch user:', error);
            return response.status(HttpCodes.Unauthorized).json({
                success: false,
                error: 'Invalid token'
            });
        }
    }

    private getTokenFromRequest(request: ApiRequest): string | null {
        const cookieHeader = request.headers.cookie;
        if (!cookieHeader) return null;

        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {} as Record<string, string>);

        return cookies[config.api.auth.cookie] || null;
    }
}
