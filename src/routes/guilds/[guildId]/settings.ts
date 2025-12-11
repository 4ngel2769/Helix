import { ApplyOptions } from '@sapphire/decorators';
import { HttpCodes, type ApiRequest, type ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { z } from 'zod';
import { Route } from '../../../lib/structures/Route';
import { ErrorHandler } from '../../../lib/structures/ErrorHandler';
import { Guild as GuildModel } from '../../../models/Guild';
import { canManageGuild, getGuildForUser } from '../../../lib/utils/discordApi';
import { getAllModuleKeys, getModuleConfig } from '../../../config/modules';

const updateSchema = z.object({
	prefix: z.string().min(1).max(5).optional(),
	adminRoleId: z.string().optional(),
	modRoleId: z.string().optional(),
	modules: z.record(z.string(), z.boolean()).optional(),
	verification: z
		.object({
			channelId: z.string().nullable().optional(),
			roleId: z.string().nullable().optional(),
			message: z.string().max(500).nullable().optional(),
			disabledMessage: z.string().max(500).nullable().optional(),
			title: z.string().max(150).nullable().optional(),
			footer: z.string().max(150).nullable().optional(),
			thumbnail: z.string().url().max(255).nullable().optional()
		})
		.optional(),
	automodKeywords: z
		.object({
			profanity: z.array(z.string().max(32)).optional(),
			scams: z.array(z.string().max(32)).optional(),
			phishing: z.array(z.string().max(32)).optional(),
			custom: z.array(z.string().max(32)).optional()
		})
		.optional()
});

@ApplyOptions<RouteOptions>({
	name: 'guild-settings',
	route: 'guilds/:guildId/settings'
})
export class GuildSettingsRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		if (!request.auth?.token) {
			return response.status(HttpCodes.Unauthorized).json({ error: 'Unauthorized' });
		}

		const method = request.method?.toUpperCase();
		const { guildId } = request.params;

		if (!guildId) {
			return response.status(HttpCodes.BadRequest).json({ error: 'Missing guildId parameter' });
		}

		try {
			const guild = await getGuildForUser(request.auth.token, guildId);
			if (!guild) {
				return response.status(HttpCodes.NotFound).json({ error: 'Guild not found' });
			}

			const manageable = canManageGuild(guild);
			if (method === 'PATCH' && !manageable) {
				return response
					.status(HttpCodes.Forbidden)
					.json({ error: 'You need Manage Guild permissions to edit settings' });
			}

			switch (method) {
				case 'GET':
					return this.handleGet(guildId, response);
				case 'PATCH':
					return this.handlePatch(guildId, request, response);
				default:
					return response.status(HttpCodes.MethodNotAllowed).json({ error: 'Method not allowed' });
			}
		} catch (error) {
			ErrorHandler.logError('Guild settings route error', error);
			return response
				.status(HttpCodes.InternalServerError)
				.json({ error: 'An error occurred while processing your request' });
		}
	}

	private async handleGet(guildId: string, response: ApiResponse) {
		const guild =
			(await GuildModel.findOne({ guildId })) ??
			(new GuildModel({
				guildId,
				modules: this.buildDefaultModules()
			}));

		return response.json({
			settings: {
				prefix: guild.prefix ?? this.container.client.options.defaultPrefix ?? '!',
				adminRoleId: guild.adminRoleId,
				modRoleId: guild.modRoleId,
				modules: guild.modules ?? this.buildDefaultModules(),
				verification: {
					channelId: guild.verificationChannelId,
					roleId: guild.verificationRoleId,
					message: guild.verificationMessage,
					disabledMessage: guild.verificationDisabledMessage,
					title: guild.verificationTitle,
					footer: guild.verificationFooter,
					thumbnail: guild.verificationThumb
				},
				automodKeywords: guild.automodKeywords
			}
		});
	}

	private async handlePatch(guildId: string, request: ApiRequest, response: ApiResponse) {
		const parsed = updateSchema.safeParse((request as any).body ?? {});
		if (!parsed.success) {
			return response.status(HttpCodes.BadRequest).json({ error: 'Invalid payload', issues: parsed.error.format() });
		}

		const update = parsed.data;
		let guild = await GuildModel.findOne({ guildId });
		if (!guild) {
			guild = new GuildModel({
				guildId,
				modules: this.buildDefaultModules()
			});
		}

		if (update.prefix !== undefined) guild.prefix = update.prefix;
		if (update.adminRoleId !== undefined) guild.adminRoleId = update.adminRoleId;
		if (update.modRoleId !== undefined) guild.modRoleId = update.modRoleId;

		if (update.modules) {
			const sanitized: Record<string, boolean> = {};
			for (const key of Object.keys(update.modules)) {
				const config = getModuleConfig(key);
				if (config) sanitized[key] = Boolean(update.modules[key]);
			}
			guild.modules = { ...(guild.modules ?? {}), ...sanitized };
		}

		if (update.verification) {
			const verification = update.verification;
			if (verification.channelId !== undefined) guild.verificationChannelId = verification.channelId ?? null;
			if (verification.roleId !== undefined) guild.verificationRoleId = verification.roleId ?? null;
			if (verification.message !== undefined) guild.verificationMessage = verification.message ?? undefined;
			if (verification.disabledMessage !== undefined)
				guild.verificationDisabledMessage = verification.disabledMessage ?? undefined;
			if (verification.title !== undefined) guild.verificationTitle = verification.title ?? undefined;
			if (verification.footer !== undefined) guild.verificationFooter = verification.footer ?? undefined;
			if (verification.thumbnail !== undefined) guild.verificationThumb = verification.thumbnail ?? undefined;
		}

		if (update.automodKeywords) {
			const existing = guild.automodKeywords ?? {
				profanity: [],
				scams: [],
				phishing: [],
				custom: []
			};
			guild.automodKeywords = {
				profanity: update.automodKeywords.profanity ?? existing.profanity,
				scams: update.automodKeywords.scams ?? existing.scams,
				phishing: update.automodKeywords.phishing ?? existing.phishing,
				custom: update.automodKeywords.custom ?? existing.custom
			};
		}

		await guild.save();

		return response.status(HttpCodes.OK).json({
			settings: {
				prefix: guild.prefix ?? this.container.client.options.defaultPrefix ?? '!',
				adminRoleId: guild.adminRoleId,
				modRoleId: guild.modRoleId,
				modules: guild.modules,
				verification: {
					channelId: guild.verificationChannelId,
					roleId: guild.verificationRoleId,
					message: guild.verificationMessage,
					disabledMessage: guild.verificationDisabledMessage,
					title: guild.verificationTitle,
					footer: guild.verificationFooter,
					thumbnail: guild.verificationThumb
				},
				automodKeywords: guild.automodKeywords
			}
		});
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

