import { Schema, model, Document } from 'mongoose';
import { getAllModuleKeys, getModuleConfig } from '../config/modules';
import type { ScopeMap } from '../lib/utils/scopedRules';

// Interface for verification settings
interface VerificationSettings {
	verificationChannelId?: string;
	verificationRoleId?: string;
	verificationMessageId?: string;
	verificationMessage?: string;
	verificationDisabledMessage?: string;
	verificationTitle?: string;
	verificationFooter?: string;
	verificationThumb?: string;
	verificationLastModifiedBy?: {
		username: string;
		id: string;
		timestamp: Date;
	};
}

// Update the LockedChannel interface
interface LockedChannel {
	channelId: string;
	originalPermissions: Array<{
		id: string;
		allow: string;
		deny: string;
		type: number;
	}>;
	lockedBy: string;
	lockedAt: Date;
	reason?: string;
	// Add these additional properties
	lockTimestamp?: number;
	duration?: number;
	unlockTimestamp?: number;
	moderator?: {
		id: string;
		tag: string;
	};
}

// AutoMod keywords interface
interface AutoModKeywords {
	profanity: string[];
	scams: string[];
	phishing: string[];
	custom: string[];
}

// Module settings interface
interface ModuleSettings {
	[key: string]: boolean;
}

// Helix custom automod filters (enforced in messageCreate; see lib/utils/customAutomod.ts).
// Distinct from Discord native AutoMod rules (managed via /automod) and from
// automodKeywords (word lists feeding the native preset installer).
export interface CustomAutomodSettings {
	enabled?: boolean;
	blockInvites?: boolean;
	blockLinks?: boolean;
	caps?: { enabled?: boolean; minLength?: number; percent?: number };
	emoji?: { enabled?: boolean; max?: number };
	spam?: { enabled?: boolean; count?: number; intervalSeconds?: number };
	repeatText?: { enabled?: boolean; count?: number; intervalSeconds?: number };
	spoilers?: { enabled?: boolean };
	attachments?: { enabled?: boolean; max?: number };
	zalgo?: boolean;
	ignoredChannels?: string[];
	ignoredRoles?: string[];
	action?: AutomodAction;
	actions?: Partial<Record<AutomodFilter, AutomodAction>>;
	timeoutSeconds?: number;
	/** Per-channel / per-role overrides keyed `c:<channelId>` / `r:<roleId>`. */
	overrides?: ScopeMap<CustomAutomodSettings>;
}

export type AutomodAction = 'delete' | 'delete_warn' | 'delete_timeout' | 'delete_kick' | 'delete_ban';
export type AutomodFilter = 'invites' | 'links' | 'caps' | 'emoji' | 'spam' | 'repeat' | 'spoilers' | 'attachments' | 'zalgo';

/** The subset of warnSettings a channel/role override may change. */
export interface WarnRuleSettings {
	thresholds?: Array<{ count: number; action: 'kick' | 'ban' | 'timeout'; duration?: number }>;
	modChannelId?: string;
	dmEnabled?: boolean;
	dmTemplate?: string;
}

export interface SetupWizard {
	startedBy: string;
	step: 'roles' | 'channels' | 'prefix' | 'modules' | 'finish';
	updatedAt: Date;
}

// Legacy module flags for backward compatibility
interface LegacyModuleFlags {
	isAdministration?: boolean;
	isModeration?: boolean;
	isFunModule?: boolean;
	isVerificationModule?: boolean;
	isWelcomingModule?: boolean;
	isEconomyModule?: boolean;
}

// Interface for reaction roles
export interface ReactionRole {
	roleId: string;
	label: string;
	description?: string;
	emoji?: string;
}

export interface ReactionRolesMenu {
	messageId: string;
	channelId: string;
	title: string;
	description: string;
	roles: ReactionRole[];
	maxSelections: number; // 0 for unlimited
	active: boolean;
	createdBy: string;
	createdAt: Date;
}

export interface RedditFeed {
	channelId: string;
	subreddit: string;
	intervalMinutes: number;
	lastPostedAt?: Date | null;
	lastPostLink?: string | null;
	active: boolean;
	createdBy: string;
	createdAt: Date;
}

export interface LevelRoleReward {
	level: number;
	roleId: string;
}

export interface LevelingSettings {
	// No enabled flag — modules.leveling is the single on/off switch.
	xpMin?: number;
	xpMax?: number;
	cooldownSeconds?: number;
	levelUpChannelId?: string | null;
	levelUpMessage?: string | null;
	ignoredChannels?: string[];
	ignoredRoles?: string[];
	roleRewards?: LevelRoleReward[];
	stackRewards?: boolean;
	/** XP per full minute spent in a voice channel. 0 or undefined disables voice XP. */
	voiceXpPerMinute?: number;
}

export interface IGuild extends Document, LegacyModuleFlags, VerificationSettings {
	guildId: string;
	prefix?: string;
	adminRoleId?: string;
	modRoleId?: string;
	muteRoleId?: string;
	autoroleId?: string;
	disabledCommands?: string[];
	modLogChannelId?: string;
	memberLogChannelId?: string;
	messageEditLogChannelId?: string;
	messageDeleteLogChannelId?: string;
	nicknameLogChannelId?: string;
	roleLogChannelId?: string;
	// Extensive logging (new system; legacy per-channel fields above act as fallback)
	logChannelId?: string;
	logEvents?: Record<string, boolean>;
	logEventChannels?: Record<string, string>;
	logIgnoredUsers?: string[];
	logIgnoredRoles?: string[];
	logIgnoredChannels?: string[];
	logIncludeBots?: boolean;
	// Greeting image cards + premium flag
	isPremium?: boolean;
	premiumExpiresAt?: Date | null;
	premiumReminderSentAt?: Date | null;
	// Soft disable: bot stays but answers commands with disabledMessage.
	botDisabled?: boolean;
	disabledMessage?: string;
	// Hard ban: bot leaves and guildCreate refuses re-entry.
	guildBanned?: boolean;
	banReason?: string;
	welcomeCard?: Record<string, unknown>;
	farewellCard?: Record<string, unknown>;
	welcomeChannelId?: string;
	welcomeMessage?: string;
	farewellChannelId?: string;
	farewellMessage?: string;
	banMessage?: string;
	joinDmMessage?: string;
	systemChannelId?: string;
	lockedChannels?: LockedChannel[];
	modules: ModuleSettings;
	automodKeywords?: AutoModKeywords;
	automodSettings?: CustomAutomodSettings;
	leveling?: LevelingSettings;
	reactionRolesMenus?: ReactionRolesMenu[];
	redditFeeds?: RedditFeed[];
	warnSettings?: {
		thresholds: Array<{ count: number; action: 'kick' | 'ban' | 'timeout'; duration?: number }>;
		modChannelId?: string;
		reasonAliases?: Record<string, string>;
		dmEnabled?: boolean;
		dmTemplate?: string;
		/** Per-channel / per-role warn rules keyed `c:<channelId>` / `r:<roleId>`. */
		overrides?: ScopeMap<WarnRuleSettings>;
	};
	setupWizard?: SetupWizard;
}

const guildSchema = new Schema<IGuild>({
	guildId: { type: String, required: true, unique: true },
	prefix: { type: String, default: null },
	adminRoleId: { type: String, default: null },
	modRoleId: { type: String, default: null },
	muteRoleId: { type: String, default: null },
	autoroleId: { type: String, default: null },
	disabledCommands: { type: [String], default: [] },

	// Logging channels
	modLogChannelId: { type: String, default: null },
	memberLogChannelId: { type: String, default: null },
	messageEditLogChannelId: { type: String, default: null },
	messageDeleteLogChannelId: { type: String, default: null },
	nicknameLogChannelId: { type: String, default: null },
	roleLogChannelId: { type: String, default: null },

	// Extensive logging: default fallback channel + per-event toggles/overrides + ignores
	logChannelId: { type: String, default: null },
	logEvents: { type: Schema.Types.Mixed, default: {} },
	logEventChannels: { type: Schema.Types.Mixed, default: {} },
	logIgnoredUsers: { type: [String], default: [] },
	logIgnoredRoles: { type: [String], default: [] },
	logIgnoredChannels: { type: [String], default: [] },
	logIncludeBots: { type: Boolean, default: false },

	// Greeting image cards (see src/lib/cards/) + premium flag (granted out-of-band)
	isPremium: { type: Boolean, default: false },
	premiumExpiresAt: { type: Date, default: null },
	premiumReminderSentAt: { type: Date, default: null },
	// Soft disable: bot stays, commands reply with disabledMessage (or the default).
	botDisabled: { type: Boolean, default: false },
	disabledMessage: { type: String, default: null },
	// Hard ban: bot leaves; guildCreate refuses re-entry while set.
	guildBanned: { type: Boolean, default: false },
	banReason: { type: String, default: null },
	welcomeCard: { type: Schema.Types.Mixed, default: {} },
	farewellCard: { type: Schema.Types.Mixed, default: {} },

	// Welcome / Farewell
	welcomeChannelId: { type: String, default: null },
	welcomeMessage: { type: String, default: null },
	farewellChannelId: { type: String, default: null },
	farewellMessage: { type: String, default: null },
	banMessage: { type: String, default: null },
	joinDmMessage: { type: String, default: null },

	// System notifications
	systemChannelId: { type: String, default: null },

	// Legacy module flags (for backward compatibility)
	isAdministration: { type: Boolean, default: true },
	isModeration: { type: Boolean, default: true },
	isFunModule: { type: Boolean, default: true },
	isVerificationModule: { type: Boolean, default: false },
	isWelcomingModule: { type: Boolean, default: false },
	isEconomyModule: { type: Boolean, default: true }, // Verification settings
	verificationChannelId: { type: String, default: null },
	verificationRoleId: { type: String, default: null },
	verificationMessageId: { type: String, default: null },
	verificationMessage: { type: String, default: 'Click the button below to verify yourself and gain access to the server!' },
	verificationDisabledMessage: { type: String, default: 'Verification is currently disabled.' },
	verificationTitle: { type: String, default: 'Server Verification' },
	verificationFooter: { type: String, default: null },
	verificationThumb: { type: String, default: null },
	verificationLastModifiedBy: {
		username: { type: String, default: null },
		id: { type: String, default: null },
		timestamp: { type: Date, default: Date.now }
	},

	// Locked channels
	lockedChannels: [
		{
			channelId: { type: String, required: true },
			originalPermissions: [
				{
					id: { type: String, required: true },
					allow: { type: String, default: '0' },
					deny: { type: String, default: '0' },
					type: { type: Number, default: 0 }
				}
			],
			lockedBy: { type: String, default: null },
			lockedAt: { type: Date, default: Date.now },
			reason: { type: String, default: null },
			// Additional properties
			lockTimestamp: { type: Number, default: null },
			duration: { type: Number, default: null },
			unlockTimestamp: { type: Number, default: null },
			moderator: {
				id: { type: String, default: null },
				tag: { type: String, default: null }
			}
		}
	],

	// New module configuration system
	modules: {
		type: Schema.Types.Mixed,
		default: () => {
			const defaults: ModuleSettings = {};
			getAllModuleKeys().forEach((moduleKey) => {
				const config = getModuleConfig(moduleKey);
				if (config) {
					defaults[moduleKey] = config.defaultEnabled;
				}
			});
			return defaults;
		}
	},

	// Warn settings
	warnSettings: {
		thresholds: [
			{
				count: { type: Number, required: true },
				action: { type: String, enum: ['kick', 'ban', 'timeout'], required: true },
				duration: { type: Number, default: null }
			}
		],
		modChannelId: { type: String, default: null },
		reasonAliases: { type: Schema.Types.Mixed, default: {} },
		dmEnabled: { type: Boolean, default: false },
		dmTemplate: { type: String, default: null }
	},

	setupWizard: {
		startedBy: { type: String, required: true },
		step: { type: String, enum: ['roles', 'channels', 'prefix', 'modules', 'finish'], required: true },
		updatedAt: { type: Date, default: Date.now }
	},

	// AutoMod keywords
	automodKeywords: {
		profanity: { type: [String], default: [] },
		scams: { type: [String], default: [] },
		phishing: { type: [String], default: [] },
		custom: { type: [String], default: [] }
	},

	// Leveling / XP (see src/lib/utils/leveling.ts)
	leveling: { type: Schema.Types.Mixed, default: {} },

	// Helix custom automod (see src/lib/utils/customAutomod.ts)
	automodSettings: { type: Schema.Types.Mixed, default: {} },

	// Reaction roles menus
	reactionRolesMenus: [
		{
			messageId: { type: String, required: true },
			channelId: { type: String, required: true },
			title: { type: String, required: true },
			description: { type: String, default: '' },
			roles: [
				{
					roleId: { type: String, required: true },
					label: { type: String, required: true },
					description: { type: String, default: null },
					emoji: { type: String, default: null }
				}
			],
			maxSelections: { type: Number, default: 0 }, // 0 for unlimited
			active: { type: Boolean, default: true },
			createdBy: { type: String, default: null },
			createdAt: { type: Date, default: Date.now }
		}
	],

	// Reddit auto-feed subscriptions (max 10 per guild, enforced in the API)
	redditFeeds: [
		{
			channelId: { type: String, required: true },
			subreddit: { type: String, required: true },
			intervalMinutes: { type: Number, default: 60 },
			lastPostedAt: { type: Date, default: null },
			lastPostLink: { type: String, default: null },
			active: { type: Boolean, default: true },
			createdBy: { type: String, default: null },
			createdAt: { type: Date, default: Date.now }
		}
	]
});

// Add a pre-save middleware to sync legacy module flags with new module system
guildSchema.pre('save', function () {
	// Sync from legacy to new system
	if (this.isModified('isAdministration')) {
		this.modules.administration = this.isAdministration ?? true;
	}
	if (this.isModified('isModeration')) {
		this.modules.moderation = this.isModeration ?? true;
	}
	if (this.isModified('isFunModule')) {
		this.modules.fun = this.isFunModule ?? true;
	}
	if (this.isModified('isVerificationModule')) {
		this.modules.verification = this.isVerificationModule ?? false;
	}
	if (this.isModified('isWelcomingModule')) {
		this.modules.welcoming = this.isWelcomingModule ?? false;
	}
	if (this.isModified('isEconomyModule')) {
		this.modules.economy = this.isEconomyModule ?? true;
	} // Sync from new system to legacy
	if (this.isModified('modules.administration')) {
		this.isAdministration = this.modules.administration;
	}
	if (this.isModified('modules.moderation')) {
		this.isModeration = this.modules.moderation;
	}
	if (this.isModified('modules.fun')) {
		this.isFunModule = this.modules.fun;
	}
	if (this.isModified('modules.verification')) {
		this.isVerificationModule = this.modules.verification;
	}
	if (this.isModified('modules.welcoming')) {
		this.isWelcomingModule = this.modules.welcoming;
	}
	if (this.isModified('modules.economy')) {
		this.isEconomyModule = this.modules.economy;
	}
});

guildSchema.index({ guildId: 1, 'reactionRolesMenus.messageId': 1 });

export const Guild = model<IGuild>('Guild', guildSchema);
