import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { User } from '../../models/User';
import { storeUserBanned } from '../../lib/utils/flagCache';
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
 * Dev-only owner panel backend for users.
 * GET /dev/users?search=&page=&limit= — search matches username (safe regex)
 * or user id substring; richest first.
 * PATCH { userId, isPremium?, botBanned?, banReason?, resetEconomy? } — botBanned is
 * enforced on every command via the global precondition; resetEconomy wipes
 * wallet/bank/inventory back to new-player defaults.
 * Requires OWNER_IDS membership.
 */
@ApplyOptions<RouteOptions>({
	name: 'api-dev-users',
	route: 'dev/users',
	methods: ['GET', 'PATCH']
})
export class ApiDevUsersRoute extends Route {
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
				const match: Record<string, unknown> = {};
				if (search) {
					match.$or = [{ userId: { $regex: escapeRegex(search) } }, { username: { $regex: escapeRegex(search), $options: 'i' } }];
				}
				if (filter === 'premium') match.isPremium = true;
				else if (filter === 'banned') match.botBanned = true;
				else if (filter === 'warned') match['warnings.active'] = true;
				const total = await User.countDocuments(match);
				const users = await User.find(match, {
					userId: 1,
					username: 1,
					isPremium: 1,
					botBanned: 1,
					banReason: 1,
					lastSeen: 1,
					'economy.wallet': 1,
					'economy.bank': 1,
					'economy.level': 1,
					warnings: 1
				})
					.sort({ 'economy.wallet': -1 })
					.skip((page - 1) * limit)
					.limit(limit)
					.lean();
				return response.json({
					total,
					page,
					limit,
				users: users.map((u) => ({
					userId: u.userId,
					username: u.username,
					isPremium: u.isPremium === true,
					botBanned: u.botBanned === true,
					banReason: u.banReason ?? null,
						lastSeen: u.lastSeen ?? null,
						wallet: u.economy?.wallet ?? 0,
						bank: u.economy?.bank ?? 0,
						level: u.economy?.level ?? 1,
						activeWarnings: (u.warnings ?? []).filter((w) => w.active).length
					}))
				});
			} catch {
				return response.status(500).json({ error: 'Failed to load users' });
			}
		}

		const body = await readJsonBody<Record<string, unknown>>(request);
		const userId = typeof body.userId === 'string' ? body.userId : null;
		if (!userId || !isSnowflake(userId)) return response.status(400).json({ error: 'userId (snowflake) is required' });

		const setOps: Record<string, unknown> = {};
		if (body.isPremium !== undefined) {
			if (typeof body.isPremium !== 'boolean') return response.status(400).json({ error: 'isPremium must be a boolean' });
			setOps.isPremium = body.isPremium;
		}
		if (body.botBanned !== undefined) {
			if (typeof body.botBanned !== 'boolean') return response.status(400).json({ error: 'botBanned must be a boolean' });
			setOps.botBanned = body.botBanned;
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
		let resetEconomy = false;
		if (body.resetEconomy === true) {
			resetEconomy = true;
			setOps.economy = {
				wallet: 1000,
				bank: 0,
				bankLimit: 10000,
				dailyStreak: 0,
				lastDaily: null,
				lastWork: null,
				level: 1,
				experience: 0,
				inventory: [],
				equipment: {},
				activeEffects: [],
				transactions: [],
				achievements: [],
				settings: { dmsOnAuction: true, autoDeposit: false, publicProfile: true }
			};
		}
		if (Object.keys(setOps).length === 0) {
			return response.status(400).json({ error: 'Nothing to update (isPremium, botBanned, banReason, resetEconomy)' });
		}
		try {
			const doc = await User.findOneAndUpdate({ userId }, { $set: setOps }, { returnDocument: 'after' });
			if (!doc) return response.status(404).json({ error: 'User not found' });
			if (body.botBanned !== undefined) storeUserBanned(userId, body.botBanned === true);
			return response.json({
				userId,
				isPremium: doc.isPremium === true,
				botBanned: doc.botBanned === true,
				banReason: doc.banReason ?? null,
				resetEconomy
			});
		} catch {
			return response.status(500).json({ error: 'Failed to update user' });
		}
	}
}
