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
