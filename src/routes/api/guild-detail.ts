import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { ChannelType } from 'discord.js';
import { GuildConfigService } from '../../lib/utils/../services/GuildConfigService';
import { canManageGuild, requireAuth, requireGuildMembership } from '../../lib/utils/apiAuth';

/**
 * Live guild detail: Discord state + stored config summary.
 * Requires the caller to be a member of the guild.
 * Extra fields (config, channels, roles) are only returned to managers.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-guild-detail',
	route: 'guilds/[guildId]',
	methods: ['GET']
})
export class ApiGuildDetailRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;

		const { guildId } = request.params as { guildId?: string };
		if (!guildId) return response.status(400).json({ error: 'Missing guildId parameter' });

		const oauthGuild = requireGuildMembership(auth, guildId, response);
		if (!oauthGuild) return undefined;

		const guild = this.container.client.guilds.cache.get(guildId);
		if (!guild) {
			return response.json({
				guild: {
					id: oauthGuild.id,
					name: oauthGuild.name,
					hasBot: false,
					canManage: canManageGuild(oauthGuild)
				}
			});
		}

		const manageable = canManageGuild(oauthGuild);
		const configuredDefault = this.container.client.options.defaultPrefix;
		const defaultPrefix = (Array.isArray(configuredDefault) ? configuredDefault[0] : configuredDefault) || 'x';
		const base: Record<string, unknown> = {
			id: guild.id,
			name: guild.name,
			icon: guild.iconURL({ size: 256 }),
			memberCount: guild.memberCount,
			hasBot: true,
			canManage: manageable,
			joinedAt: guild.joinedAt?.toISOString() ?? null,
			ownerId: guild.ownerId ?? null,
			defaultPrefix
		};

		if (!manageable) return response.json({ guild: base });

		let configSummary: Record<string, unknown> | null = null;
		try {
			const data = await GuildConfigService.getOrCreateGuildData(guildId);
			configSummary = {
				prefix: data.prefix ?? null,
				modules: data.modules ?? {},
				disabledCommands: data.disabledCommands ?? [],
				welcomeChannelId: data.welcomeChannelId ?? null,
				farewellChannelId: data.farewellChannelId ?? null,
				systemChannelId: data.systemChannelId ?? null,
				modLogChannelId: data.modLogChannelId ?? null,
				verificationChannelId: (data as unknown as Record<string, unknown>).verificationChannelId ?? null,
				verificationRoleId: (data as unknown as Record<string, unknown>).verificationRoleId ?? null
			};
		} catch {
			configSummary = null;
		}

		const channels = guild.channels.cache
			.filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
			.map((c) => ({ id: c.id, name: (c as { name?: string }).name ?? c.id, type: c.type }))
			.sort((a, b) => a.name.localeCompare(b.name))
			.slice(0, 200);
		const roles = guild.roles.cache
			.map((r) => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position, managed: r.managed }))
			.sort((a, b) => b.position - a.position)
			.slice(0, 200);

		return response.json({ guild: { ...base, config: configSummary, channels, roles } });
	}
}

