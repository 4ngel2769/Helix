import { ApplyOptions } from '@sapphire/decorators';
import { HttpCodes, type ApiRequest, type ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { Route } from '../../lib/structures/Route';
import { Guild as GuildModel } from '../../models/Guild';
import { getAllModuleKeys, getModuleConfig } from '../../config/modules';
import { canManageGuild, getGuildForUser, withGuildIcon } from '../../lib/utils/discordApi';
import { ErrorHandler } from '../../lib/structures/ErrorHandler';

@ApplyOptions<RouteOptions>({
	name: 'guild-details',
	route: 'guilds/:guildId'
})
export class GuildsRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		if (request.method?.toUpperCase() !== 'GET') {
			return response.status(HttpCodes.MethodNotAllowed).json({ error: 'Method not allowed' });
		}

		if (!request.auth?.token) {
			return response.status(HttpCodes.Unauthorized).json({ error: 'Unauthorized' });
		}

		const { guildId } = request.params;
		if (!guildId) {
			return response.status(HttpCodes.BadRequest).json({ error: 'Missing guildId parameter' });
		}

		try {
			const guild = await getGuildForUser(request.auth.token, guildId);
			if (!guild) {
				return response
					.status(HttpCodes.NotFound)
					.json({ error: 'Guild not found or not accessible by user' });
			}

			const hasManagePermission = canManageGuild(guild);
			const dbGuild =
				(await GuildModel.findOne({ guildId })) ??
				(new GuildModel({
					guildId,
					modules: this.buildDefaultModules()
				}));

			const payload = {
				guild: {
					...withGuildIcon(guild),
					hasBot: this.container.client.guilds.cache.has(guild.id),
					manageable: hasManagePermission
				},
				settings: {
					prefix: dbGuild.prefix ?? this.container.client.options.defaultPrefix ?? '!',
					adminRoleId: dbGuild.adminRoleId,
					modRoleId: dbGuild.modRoleId,
					modules: dbGuild.modules ?? this.buildDefaultModules(),
					verification: {
						channelId: dbGuild.verificationChannelId,
						roleId: dbGuild.verificationRoleId,
						message: dbGuild.verificationMessage,
						disabledMessage: dbGuild.verificationDisabledMessage,
						title: dbGuild.verificationTitle,
						footer: dbGuild.verificationFooter,
						thumbnail: dbGuild.verificationThumb
					},
					automodKeywords: dbGuild.automodKeywords
				}
			};

			return response.json(payload);
		} catch (error) {
			ErrorHandler.logError('Failed to fetch guild details', error);
			return response.status(HttpCodes.InternalServerError).json({ error: 'Failed to fetch guild' });
		}
	}

	private buildDefaultModules() {
		const modules: Record<string, boolean> = {};
		getAllModuleKeys().forEach((key) => {
			const config = getModuleConfig(key);
			if (config) modules[key] = config.defaultEnabled;
		});
		return modules;
	}
}
