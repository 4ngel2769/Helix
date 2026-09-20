import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { Guild } from '../../models/Guild';
import { clearGuildFlags, storeGuildFlags } from '../../lib/utils/flagCache';
import { sanitizeText } from '../../lib/utils/sanitize';
import { isSnowflake, readJsonBody, readQueryParam, requireAuth, requireDev } from '../../lib/utils/apiAuth';

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pageParams(request: ApiRequest): { page: number; limit: number } {
	const page = Math.max(1, parseInt(readQueryParam(request, 'page') ?? '1', 10) || 1);
	const limit = Math.min(50, Math.max(1, parseInt(readQueryParam(request, 'limit') ?? '20', 10) || 20));
	return { page, limit };
}

/**
 * Dev-only owner panel backend.
 * GET /dev/guilds?search=&page=&limit= — every guild the bot is in, with
 * premium/disabled/banned flags (search matches name or id, biggest first).
 * PATCH { guildId, isPremium?, botDisabled?, disabledMessage?, guildBanned?, banReason? }
 * - botDisabled stays in the server; commands reply with disabledMessage (or default).
 * - guildBanned makes the bot leave immediately (guildCreate refuses re-entry).
 * POST { guildId, action: 'leave' | 'reset' } — leave, or wipe the Guild doc
 * back to defaults (bot stays).
 * Requires OWNER_IDS membership.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-dev-guilds',
	route: 'dev/guilds',
	methods: ['GET', 'PATCH', 'POST']
})
export class ApiDevGuildsRoute extends Route {
	public override async run(request: ApiRequest, response: ApiResponse) {
		const auth = await requireAuth(request, response);
		if (!auth) return undefined;
		const dev = await requireDev(auth, response);
		if (!dev) return undefined;

		if (request.method === 'GET') {
			try {
				const search = (readQueryParam(request, 'search') ?? '').trim().slice(0, 64);
				const filter = readQueryParam(request, 'filter') ?? 'all';
				const { page, limit } = pageParams(request);
				let guilds = [...this.container.client.guilds.cache.values()];
				if (search) {
					if (/^\d+$/.test(search)) {
						guilds = guilds.filter((g) => g.id.includes(search));
					} else {
						const re = new RegExp(escapeRegex(search), 'i');
						guilds = guilds.filter((g) => re.test(g.name));
					}
				}
				const ids = guilds.map((g) => g.id);
				const docs = await Guild.find(
					{ guildId: { $in: ids } },
					{ guildId: 1, isPremium: 1, botDisabled: 1, guildBanned: 1, disabledMessage: 1, banReason: 1 }
				).lean();
				const flags = new Map(docs.map((d) => [d.guildId, d]));
				if (filter === 'premium') guilds = guilds.filter((g) => flags.get(g.id)?.isPremium === true);
				else if (filter === 'disabled') guilds = guilds.filter((g) => flags.get(g.id)?.botDisabled === true);
				else if (filter === 'banned') guilds = guilds.filter((g) => flags.get(g.id)?.guildBanned === true);
				else if (filter === 'large') guilds = guilds.filter((g) => g.memberCount >= 1000);
				const total = guilds.length;
				const slice = guilds
					.sort((a, b) => b.memberCount - a.memberCount)
					.slice((page - 1) * limit, page * limit)
					.map((guild) => {
						const owner = guild.members.cache.get(guild.ownerId)?.user ?? this.container.client.users.cache.get(guild.ownerId);
						return {
							id: guild.id,
							name: guild.name,
							icon: guild.iconURL({ size: 128 }),
							memberCount: guild.memberCount,
							ownerId: guild.ownerId,
							ownerUsername: owner?.username ?? null,
							joinedAt: guild.joinedAt?.toISOString() ?? null,
							channels: guild.channels.cache.size,
							roles: guild.roles.cache.size,
							isPremium: flags.get(guild.id)?.isPremium === true,
							botDisabled: flags.get(guild.id)?.botDisabled === true,
							guildBanned: flags.get(guild.id)?.guildBanned === true,
							disabledMessage: flags.get(guild.id)?.disabledMessage ?? null,
							banReason: flags.get(guild.id)?.banReason ?? null
						};
					});
				return response.json({ total, page, limit, guilds: slice });
			} catch {
				return response.status(500).json({ error: 'Failed to load bot guilds' });
			}
		}

		const body = await readJsonBody<Record<string, unknown>>(request);
		const guildId = typeof body.guildId === 'string' ? body.guildId : null;
		if (!guildId || !isSnowflake(guildId)) return response.status(400).json({ error: 'guildId (snowflake) is required' });

		if (request.method === 'PATCH') {
			const setOps: Record<string, unknown> = {};
			if (body.isPremium !== undefined) {
				if (typeof body.isPremium !== 'boolean') return response.status(400).json({ error: 'isPremium must be a boolean' });
				setOps.isPremium = body.isPremium;
			}
			if (body.botDisabled !== undefined) {
				if (typeof body.botDisabled !== 'boolean') return response.status(400).json({ error: 'botDisabled must be a boolean' });
				setOps.botDisabled = body.botDisabled;
			}
			if (body.disabledMessage !== undefined) {
				if (body.disabledMessage !== null) {
					const clean = sanitizeText(body.disabledMessage, 500);
					if (!clean) return response.status(400).json({ error: 'disabledMessage must be null or text up to 500 chars' });
					setOps.disabledMessage = clean;
				} else {
					setOps.disabledMessage = null;
				}
			}
			if (body.guildBanned !== undefined) {
				if (typeof body.guildBanned !== 'boolean') return response.status(400).json({ error: 'guildBanned must be a boolean' });
				setOps.guildBanned = body.guildBanned;
			}
			if (body.banReason !== undefined) {
				if (body.banReason !== null) {
					const clean = sanitizeText(body.banReason, 1000);
					if (!clean) return response.status(400).json({ error: 'banReason must be null or text up to 1000 chars' });
					setOps.banReason = clean;
				} else {
					setOps.banReason = null;
				}
			}
			if (Object.keys(setOps).length === 0) {
				return response.status(400).json({ error: 'Nothing to update (isPremium, botDisabled, disabledMessage, guildBanned, banReason)' });
			}
			try {
				const doc = await Guild.findOneAndUpdate({ guildId }, { $set: setOps }, { upsert: true, returnDocument: 'after' }).lean();
				storeGuildFlags(guildId, {
					disabled: doc?.botDisabled === true,
					banned: doc?.guildBanned === true,
					message: typeof doc?.disabledMessage === 'string' ? doc.disabledMessage : null
				});
				if (setOps.guildBanned === true) {
					const guild = this.container.client.guilds.cache.get(guildId);
					await guild?.leave().catch(() => null);
				}
				return response.json({
					guildId,
					isPremium: doc?.isPremium === true,
					botDisabled: doc?.botDisabled === true,
					guildBanned: doc?.guildBanned === true,
					disabledMessage: doc?.disabledMessage ?? null,
					banReason: doc?.banReason ?? null
				});
			} catch {
				return response.status(500).json({ error: 'Failed to update guild flags' });
			}
		}

		// POST actions
		const action = typeof body.action === 'string' ? body.action : null;
		if (action !== 'leave' && action !== 'reset') {
			return response.status(400).json({ error: 'action must be leave or reset' });
		}
		try {
			if (action === 'leave') {
				const guild = this.container.client.guilds.cache.get(guildId);
				if (!guild) return response.status(404).json({ error: 'Bot is not in that guild' });
				await guild.leave();
				return response.json({ guildId, left: true });
			}
			await Guild.deleteOne({ guildId });
			clearGuildFlags(guildId);
			return response.json({ guildId, reset: true });
		} catch {
			return response.status(500).json({ error: 'Action failed' });
		}
	}
}
