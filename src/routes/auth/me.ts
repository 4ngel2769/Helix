import { ApplyOptions } from '@sapphire/decorators';
import { HttpCodes, type ApiRequest, type ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { Route } from '../../lib/structures/Route';
import { fetchDiscordUser } from '../../lib/utils/discordApi';

@ApplyOptions<RouteOptions>({
	name: 'auth-me',
	route: 'auth/me'
})
export class AuthMeRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		if (request.method?.toUpperCase() !== 'GET') {
			return response.status(HttpCodes.MethodNotAllowed).json({ error: 'Method not allowed' });
		}

		if (!request.auth?.token) {
			return response.status(HttpCodes.Unauthorized).json({ authenticated: false });
		}

		const user = await fetchDiscordUser(request.auth.token);
		if (!user) {
			return response.status(HttpCodes.Unauthorized).json({ authenticated: false });
		}

		return response.json({
			authenticated: true,
			user: {
				id: user.id,
				username: user.username,
				discriminator: user.discriminator,
				avatar: user.avatar
			}
		});
	}
}

