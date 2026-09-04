import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { Guild } from '../../models/Guild';
import { GuildConfigService } from '../../lib/services/GuildConfigService';
import { postReactionRoleMenuMessage } from '../../lib/utils/reactionRolesHelpers';
import { isSnowflake, readBody, readQueryParam, requireAuth, requireManageableGuild } from '../../lib/utils/apiAuth';

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
		if (!guildId || !isSnowflake(guildId)) return response.status(400).json({ error: 'Invalid guildId parameter' });

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
			const body = readBody<Record<string, unknown>>(request);
			const channelId = typeof body.channelId === 'string' ? body.channelId : null;
			const title = typeof body.title === 'string' ? body.title.trim() : '';
			const description = typeof body.description === 'string' ? body.description.slice(0, 2000) : '';
			const messageId = typeof body.messageId === 'string' ? body.messageId : undefined;
			const createMessage = body.createMessage === true;
			const maxSelections =
				typeof body.maxSelections === 'number' && Number.isInteger(body.maxSelections)
					? Math.min(Math.max(body.maxSelections, 0), 25)
					: 0;
			const active = body.active !== false;

			if (!channelId || !isSnowflake(channelId) || !title || title.length > 256) {
				return response.status(400).json({ error: 'channelId (snowflake) and title (1-256 chars) are required' });
			}
			if (!createMessage && (!messageId || !isSnowflake(messageId))) {
				return response.status(400).json({ error: 'messageId (snowflake) is required unless createMessage is true' });
			}
			if (!Array.isArray(body.roles)) {
				return response.status(400).json({ error: 'roles must be an array' });
			}
			if (body.roles.length === 0 || body.roles.length > 25) {
				return response.status(400).json({ error: 'Provide between 1 and 25 roles' });
			}
			const cleanRoles: ReactionRoleInput[] = [];
			for (const r of body.roles as unknown[]) {
				if (typeof r !== 'object' || r === null) {
					return response.status(400).json({ error: 'Every role must be an object' });
				}
				const rec = r as Record<string, unknown>;
				const roleId = typeof rec.roleId === 'string' ? rec.roleId : '';
				const label = typeof rec.label === 'string' ? rec.label.trim().slice(0, 100) : '';
				const rDescription = typeof rec.description === 'string' ? rec.description.slice(0, 200) : undefined;
				const emoji = typeof rec.emoji === 'string' ? rec.emoji.slice(0, 64) : undefined;
				if (!isSnowflake(roleId) || !label) {
					return response.status(400).json({ error: 'Every role needs a roleId (snowflake) and a label' });
				}
				cleanRoles.push({ roleId, label, description: rDescription, emoji });
			}

			try {
				const data = await GuildConfigService.getOrCreateGuildData(guildId);
				let resolvedMessageId = messageId;
				if (createMessage || !resolvedMessageId) {
					try {
						resolvedMessageId = await postReactionRoleMenuMessage({
							guildId,
							channelId,
							title,
							description,
							roles: cleanRoles,
							maxSelections,
							active
						});
					} catch (error) {
						const reason = error instanceof Error ? error.message : 'Failed to post the message';
						return response.status(502).json({ error: `Could not post message: ${reason}` });
					}
				}
				if ((data.reactionRolesMenus ?? []).some((m) => m.messageId === resolvedMessageId)) {
					return response.status(409).json({ error: 'A menu with this messageId already exists' });
				}
				const menu = {
					messageId: resolvedMessageId,
					channelId,
					title,
					description,
					roles: cleanRoles,
					maxSelections,
					active,
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
			const body = readBody<Record<string, unknown>>(request);
			const messageId = typeof body.messageId === 'string' ? body.messageId : null;
			if (!messageId || !isSnowflake(messageId)) return response.status(400).json({ error: 'messageId (snowflake) is required' });

			const setOps: Record<string, unknown> = {};
			if (body.channelId !== undefined) {
				if (typeof body.channelId !== 'string' || !isSnowflake(body.channelId)) {
					return response.status(400).json({ error: 'channelId must be a snowflake' });
				}
			}
			if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim().length === 0 || body.title.length > 256)) {
				return response.status(400).json({ error: 'title must be 1-256 chars' });
			}
			if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 2000)) {
				return response.status(400).json({ error: 'description must be a string of max 2000 chars' });
			}
			if (body.maxSelections !== undefined && (!Number.isInteger(body.maxSelections) || (body.maxSelections as number) < 0 || (body.maxSelections as number) > 25)) {
				return response.status(400).json({ error: 'maxSelections must be an integer 0-25' });
			}
			if (body.active !== undefined && typeof body.active !== 'boolean') {
				return response.status(400).json({ error: 'active must be a boolean' });
			}
			let cleanRoles: ReactionRoleInput[] | undefined;
			if (body.roles !== undefined) {
				if (!Array.isArray(body.roles) || body.roles.length > 25) {
					return response.status(400).json({ error: 'roles must be an array of max 25' });
				}
				cleanRoles = [];
				for (const r of body.roles as unknown[]) {
					if (typeof r !== 'object' || r === null) {
						return response.status(400).json({ error: 'Every role must be an object' });
					}
					const rec = r as Record<string, unknown>;
					const roleId = typeof rec.roleId === 'string' ? rec.roleId : '';
					const label = typeof rec.label === 'string' ? rec.label.trim().slice(0, 100) : '';
					if (!isSnowflake(roleId) || !label) {
						return response.status(400).json({ error: 'Every role needs a roleId (snowflake) and a label' });
					}
					cleanRoles.push({
						roleId,
						label,
						description: typeof rec.description === 'string' ? rec.description.slice(0, 200) : undefined,
						emoji: typeof rec.emoji === 'string' ? rec.emoji.slice(0, 64) : undefined
					});
				}
			}
			// Use arrayFilters via positional update of the matched menu
			try {
				const data = await GuildConfigService.getOrCreateGuildData(guildId);
				const idx = (data.reactionRolesMenus ?? []).findIndex((m) => m.messageId === messageId);
				if (idx === -1) return response.status(404).json({ error: 'Reaction-role menu not found' });
				if (body.channelId !== undefined) setOps[`reactionRolesMenus.${idx}.channelId`] = body.channelId;
				if (body.title !== undefined) setOps[`reactionRolesMenus.${idx}.title`] = (body.title as string).trim();
				if (body.description !== undefined) setOps[`reactionRolesMenus.${idx}.description`] = body.description;
				if (body.maxSelections !== undefined) setOps[`reactionRolesMenus.${idx}.maxSelections`] = body.maxSelections;
				if (body.active !== undefined) setOps[`reactionRolesMenus.${idx}.active`] = body.active;
				if (cleanRoles !== undefined) setOps[`reactionRolesMenus.${idx}.roles`] = cleanRoles;
				if (Object.keys(setOps).length === 0) return response.status(400).json({ error: 'No fields to update' });
				await Guild.updateOne({ guildId }, { $set: setOps });
				const updated = await Guild.findOne({ guildId }, { reactionRolesMenus: 1 }).lean();
				const menu = updated?.reactionRolesMenus?.find((m: { messageId: string }) => m.messageId === messageId);
				return response.json({ guildId, menu });
			} catch {
				return response.status(500).json({ error: 'Failed to update reaction-role menu' });
			}
		}

		// DELETE ?messageId=...
		const deleteMessageId = readQueryParam(request, 'messageId') ?? readBody<Record<string, unknown>>(request).messageId;
		if (typeof deleteMessageId !== 'string' || !isSnowflake(deleteMessageId)) {
			return response.status(400).json({ error: 'messageId (snowflake) is required' });
		}
		try {
			const result = await Guild.updateOne({ guildId }, { $pull: { reactionRolesMenus: { messageId: deleteMessageId } } });
			if (result.modifiedCount === 0) return response.status(404).json({ error: 'Reaction-role menu not found' });
			return response.json({ guildId, deleted: deleteMessageId });
		} catch {
			return response.status(500).json({ error: 'Failed to delete reaction-role menu' });
		}
	}
}

