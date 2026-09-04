export interface DashboardUser {
	id: string;
	username: string;
	avatar: string | null;
	avatarUrl: string | null;
}

export interface GuildListEntry {
	id: string;
	name: string;
	icon: string | null;
	owner: boolean;
	permissions: string;
	canManage: boolean;
	hasBot: boolean;
	approximate_member_count?: number;
}

export interface GuildChannel {
	id: string;
	name: string;
	type: number;
}

export interface GuildRole {
	id: string;
	name: string;
	color: string;
	position: number;
	managed: boolean;
}

export interface GuildDetail {
	id: string;
	name: string;
	icon: string | null;
	memberCount: number;
	hasBot: boolean;
	canManage: boolean;
	joinedAt: string | null;
	ownerId: string | null;
	defaultPrefix?: string | null;
	config?: Record<string, unknown> | null;
	channels?: GuildChannel[];
	roles?: GuildRole[];
}

export interface ModuleEntry {
	key: string;
	name: string;
	description: string;
	defaultEnabled: boolean;
	enabled: boolean;
}

export interface WarningEntry {
	_id?: string;
	userId: string;
	username?: string;
	guildId: string;
	reason: string;
	moderatorTag?: string;
	timestamp?: string;
	active: boolean;
}

export interface ReactionRoleMenu {
	messageId: string;
	channelId: string;
	title: string;
	description: string;
	roles: Array<{ roleId: string; label: string; description?: string; emoji?: string }>;
	maxSelections: number;
	active: boolean;
}

export interface CommandEntry {
	name: string;
	description: string;
	category: string | null;
	module?: string | null;
}

export interface SelfWarning {
	guildId: string;
	guildName: string | null;
	reason: string;
	moderatorTag: string;
	timestamp: string;
	active: boolean;
}

export interface MeData {
	userId: string;
	username: string | null;
	avatar: string | null;
	isDeveloper: boolean;
	hasData: boolean;
	economy: {
		wallet: number;
		bank: number;
		bankLimit: number;
		total: number;
		level: number;
		experience: number;
		dailyStreak: number;
		inventoryTotal: number;
		inventory: Array<{ itemId: string; name: string; quantity: number; rarity: string }>;
		equipment: Record<string, string | null>;
		stats: Record<string, number> | null;
		achievements: string[];
		publicProfile: boolean;
	} | null;
	warnings: SelfWarning[];
	activeWarnings: number;
	servers: { known: string[]; lastSeen: string | null; firstSeen: string | null };
}

export interface LeaderboardEntry {
	rank: number;
	userId: string;
	username: string | null;
	wallet: number;
	bank: number;
	total: number;
	level: number;
	experience: number;
}

export interface ShopItem {
	itemId: string;
	name: string;
	description?: string;
	category?: string;
	rarity?: string;
	basePrice?: number;
	shop?: { available?: boolean; price?: number };
}

export interface AuctionEntry {
	auctionId: string;
	guildId?: string;
	sellerId?: string;
	itemId?: string;
	itemName?: string;
	startingBid?: number;
	currentBid?: number;
	status?: string;
	endTime?: string;
}

export interface DevGuildEntry {
	id: string;
	name: string;
	icon: string | null;
	memberCount: number;
	ownerId: string;
	ownerUsername: string | null;
	joinedAt: string | null;
	channels: number;
	roles: number;
}

export interface DevStats {
	version: string;
	bot: { username: string; id: string | null };
	uptimeMs: number;
	discord: { guilds: number; users: number; channels: number };
	commands: number;
	modules: number;
	database: { users: number; guildDocs: number; activeAuctions: number; items: number };
	memory: { heapUsedMb: number; heapTotalMb: number; rssMb: number };
}

export interface RedditFeed {
	feedId: string;
	channelId: string;
	subreddit: string;
	intervalMinutes: number;
	lastPostedAt: string | null;
	lastPostLink: string | null;
	active: boolean;
}
