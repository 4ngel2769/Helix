import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { Guild } from '../../models/Guild';
import { GuildConfigService } from '../../lib/services/GuildConfigService';
import { postReactionRoleMenuMessage } from '../../lib/utils/reactionRolesHelpers';
import { readBody, readQueryParam, requireAuth, requireManageableGuild } from '../../lib/utils/apiAuth';

interface ReactionRoleInput {
	roleId: string;
	label: string;
	description?: string;
	emoji?: string;
}

/**
 * Reaction-role menus stored on the Guild document.
 * GET lists menus (?messageId= for one). POST creates, PATCH updates, DELETE removes.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-guild-reaction-roles',
	route: 'guilds/[guildId]/reaction-roles',
	methods: ['GET', 'POST', 'PATCH', 'DELETE']
})
export class ApiGuildReactionRolesRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;

		const { guildId } = request.params as { guildId?: string };
		if (!guildId) return response.status(400).json({ error: 'Missing guildId parameter' });

		const manageable = requireManageableGuild(auth, guildId, response);
		if (!manageable) return undefined;

		const method = request.method;

		if (method === 'GET') {
			try {
				const data = await GuildConfigService.getOrCreateGuildData(guildId);
				const menus = data.reactionRolesMenus ?? [];
				const messageId = readQueryParam(request, 'messageId');
				if (messageId) {
					const menu = menus.find((m) => m.messageId === messageId);
					if (!menu) return response.status(404).json({ error: 'Reaction-role menu not found' });
					return response.json({ guildId, menu });
				}
				return response.json({ guildId, total: menus.length, menus });
			} catch {
				return response.status(500).json({ error: 'Failed to load reaction-role menus' });
			}
		}

		if (method === 'POST') {
			const body = readBody<{
				messageId?: string;
				channelId?: string;
				title?: string;
				description?: string;
				maxSelections?: number;
				roles?: ReactionRoleInput[];
				active?: boolean;
				createMessage?: boolean;
			}>(request);

			if (!body.channelId || !body.title) {
				return response.status(400).json({ error: 'channelId and title are required' });
			}
			if (!body.createMessage && !body.messageId) {
				return response.status(400).json({ error: 'messageId is required unless createMessage is true' });
			}
			if (body.roles && !Array.isArray(body.roles)) {
				return response.status(400).json({ error: 'roles must be an array' });
			}
			const cleanRoles = (body.roles ?? []).map((r) => ({
				roleId: r.roleId,
				label: r.label,
				description: r.description,
				emoji: r.emoji
			}));
			if (cleanRoles.length === 0) {
				return response.status(400).json({ error: 'Add at least one role before saving' });
			}
			if (cleanRoles.some((r) => !r.roleId || !r.label)) {
				return response.status(400).json({ error: 'Every role needs a roleId and a label' });
			}

			try {
				const data = await GuildConfigService.getOrCreateGuildData(guildId);
				let messageId = body.messageId;
				if (body.createMessage || !messageId) {
					try {
						messageId = await postReactionRoleMenuMessage({
							guildId,
							channelId: body.channelId,
							title: body.title,
							description: body.description ?? '',
							roles: cleanRoles,
							maxSelections: body.maxSelections ?? 0,
							active: body.active ?? true
						});
					} catch (error) {
						const reason = error instanceof Error ? error.message : 'Failed to post the message';
						return response.status(502).json({ error: `Could not post message: ${reason}` });
					}
				}
				if ((data.reactionRolesMenus ?? []).some((m) => m.messageId === messageId)) {
					return response.status(409).json({ error: 'A menu with this messageId already exists' });
				}
				const menu = {
					messageId,
					channelId: body.channelId,
					title: body.title,
					description: body.description ?? '',
					roles: cleanRoles,
					maxSelections: body.maxSelections ?? 0,
					active: body.active ?? true,
					createdBy: 'api',
					createdAt: new Date()
				};
				await Guild.updateOne({ guildId }, { $push: { reactionRolesMenus: menu } });
				return response.status(201).json({ guildId, menu });
			} catch {
				return response.status(500).json({ error: 'Failed to create reaction-role menu' });
			}
		}

		if (method === 'PATCH') {
			const body = readBody<{ messageId?: string; channelId?: string; title?: string; description?: string; maxSelections?: number; active?: boolean; roles?: ReactionRoleInput[] }>(request);
			if (!body.messageId) return response.status(400).json({ error: 'messageId is required' });

			const setOps: Record<string, unknown> = {};
			// Use arrayFilters via positional update of the matched menu
			try {
				const data = await GuildConfigService.getOrCreateGuildData(guildId);
				const idx = (data.reactionRolesMenus ?? []).findIndex((m) => m.messageId === body.messageId);
				if (idx === -1) return response.status(404).json({ error: 'Reaction-role menu not found' });
				if (body.channelId !== undefined) setOps[`reactionRolesMenus.${idx}.channelId`] = body.channelId;
				if (body.title !== undefined) setOps[`reactionRolesMenus.${idx}.title`] = body.title;
				if (body.description !== undefined) setOps[`reactionRolesMenus.${idx}.description`] = body.description;
				if (body.maxSelections !== undefined) setOps[`reactionRolesMenus.${idx}.maxSelections`] = body.maxSelections;
				if (body.active !== undefined) setOps[`reactionRolesMenus.${idx}.active`] = body.active;
				if (body.roles !== undefined) {
					if (!Array.isArray(body.roles)) return response.status(400).json({ error: 'roles must be an array' });
					setOps[`reactionRolesMenus.${idx}.roles`] = body.roles;
				}
				if (Object.keys(setOps).length === 0) return response.status(400).json({ error: 'No fields to update' });
				await Guild.updateOne({ guildId }, { $set: setOps });
				const updated = await Guild.findOne({ guildId }, { reactionRolesMenus: 1 }).lean();
				const menu = updated?.reactionRolesMenus?.find((m: { messageId: string }) => m.messageId === body.messageId);
				return response.json({ guildId, menu });
			} catch {
				return response.status(500).json({ error: 'Failed to update reaction-role menu' });
			}
		}

		// DELETE ?messageId=...
		const messageId = readQueryParam(request, 'messageId') ?? readBody<{ messageId?: string }>(request).messageId;
		if (!messageId) return response.status(400).json({ error: 'messageId is required' });
		try {
			const result = await Guild.updateOne({ guildId }, { $pull: { reactionRolesMenus: { messageId } } });
			if (result.modifiedCount === 0) return response.status(404).json({ error: 'Reaction-role menu not found' });
			return response.json({ guildId, deleted: messageId });
		} catch {
			return response.status(500).json({ error: 'Failed to delete reaction-role menu' });
		}
	}
}

