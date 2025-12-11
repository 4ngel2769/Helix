import { ApplyOptions } from '@sapphire/decorators';
import { HttpCodes, type ApiRequest, type ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { z } from 'zod';
import { Route } from '../../lib/structures/Route';
import { User } from '../../models/User';
import { fetchDiscordUser } from '../../lib/utils/discordApi';
import { ErrorHandler } from '../../lib/structures/ErrorHandler';

const updateSchema = z.object({
	displayName: z.string().min(2).max(32).optional(),
	pronouns: z.string().min(2).max(32).optional(),
	bio: z.string().max(240).optional()
});

@ApplyOptions<RouteOptions>({
	name: 'current-user',
	route: 'users/me'
})
export class CurrentUserRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		if (!request.auth?.token) {
			return response.status(HttpCodes.Unauthorized).json({ error: 'Unauthorized' });
		}

		const method = request.method?.toUpperCase();
		if (method !== 'GET' && method !== 'PATCH') {
			return response.status(HttpCodes.MethodNotAllowed).json({ error: 'Method not allowed' });
		}

		try {
			const profile = await fetchDiscordUser(request.auth.token);
			if (!profile) {
				return response
					.status(HttpCodes.Unauthorized)
					.json({ error: 'Could not validate Discord user with provided token' });
			}

			let user = await User.findOne({ userId: profile.id });
			if (!user) {
				user = new User({
					userId: profile.id,
					username: profile.username,
					discriminator: profile.discriminator
				});
				await user.save();
			}

			if (method === 'PATCH') {
			const parsed = updateSchema.safeParse((request as any).body ?? {});
				if (!parsed.success) {
					return response
						.status(HttpCodes.BadRequest)
						.json({ error: 'Invalid payload', issues: parsed.error.format() });
				}

				const updates = parsed.data;
				if (updates.displayName !== undefined) user.displayName = updates.displayName;
				if (updates.pronouns !== undefined) user.pronouns = updates.pronouns;
				if (updates.bio !== undefined) user.bio = updates.bio;
				await user.save();
			}

			return response.json({
				user: {
					id: user.userId,
					username: user.username,
					discriminator: user.discriminator,
					displayName: user.displayName,
					pronouns: user.pronouns,
					bio: user.bio,
					joinedServers: user.joinedServers,
					lastSeen: user.lastSeen
				}
			});
		} catch (error) {
			ErrorHandler.logError('Failed to process /users/me', error);
			return response.status(HttpCodes.InternalServerError).json({ error: 'Failed to load user profile' });
		}
	}
}

