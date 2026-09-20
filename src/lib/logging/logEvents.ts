export interface LogEventDef {
	key: string;
	label: string;
	description: string;
	defaultEnabled: boolean;
	/** Legacy per-channel field on Guild used as fallback before the default channel. */
	legacyChannel?: 'modLogChannelId' | 'memberLogChannelId' | 'messageEditLogChannelId' | 'messageDeleteLogChannelId' | 'nicknameLogChannelId' | 'roleLogChannelId';
}

export interface LogEventGroup {
	id: string;
	label: string;
	color: string;
	events: LogEventDef[];
}

export const LOG_EVENT_GROUPS: LogEventGroup[] = [
	{
		id: 'moderation',
		label: 'Moderation',
		color: '#ff5252',
		events: [
			{ key: 'mod.ban', label: 'Ban', description: 'Member banned.', defaultEnabled: true, legacyChannel: 'modLogChannelId' },
			{ key: 'mod.unban', label: 'Unban', description: 'Member unbanned.', defaultEnabled: true, legacyChannel: 'modLogChannelId' },
			{ key: 'mod.kick', label: 'Kick', description: 'Member kicked.', defaultEnabled: true, legacyChannel: 'modLogChannelId' },
			{ key: 'mod.timeout', label: 'Timeout', description: 'Member timed out.', defaultEnabled: true, legacyChannel: 'modLogChannelId' },
			{ key: 'mod.untimeout', label: 'Timeout removed', description: 'Member timeout removed.', defaultEnabled: false, legacyChannel: 'modLogChannelId' },
			{ key: 'mod.mute', label: 'Mute', description: 'Member muted (mute role).', defaultEnabled: true, legacyChannel: 'modLogChannelId' },
			{ key: 'mod.unmute', label: 'Unmute', description: 'Member unmuted.', defaultEnabled: false, legacyChannel: 'modLogChannelId' },
			{ key: 'mod.warn', label: 'Warn', description: 'Warning issued.', defaultEnabled: true, legacyChannel: 'modLogChannelId' },
			{ key: 'mod.purge', label: 'Purge', description: 'Bulk message purge by a moderator.', defaultEnabled: true, legacyChannel: 'modLogChannelId' }
		]
	},
	{
		id: 'members',
		label: 'Members',
		color: '#49e358',
		events: [
			{ key: 'member.join', label: 'Join', description: 'Member joined the server.', defaultEnabled: false, legacyChannel: 'memberLogChannelId' },
			{ key: 'member.leave', label: 'Leave', description: 'Member left the server.', defaultEnabled: false, legacyChannel: 'memberLogChannelId' },
			{ key: 'member.nickname', label: 'Nickname change', description: 'Nickname changed.', defaultEnabled: true, legacyChannel: 'nicknameLogChannelId' },
			{ key: 'member.roles', label: 'Role change', description: 'Roles added or removed.', defaultEnabled: true, legacyChannel: 'roleLogChannelId' },
			{ key: 'member.boost', label: 'Boost', description: 'Server boost started or stopped.', defaultEnabled: true, legacyChannel: 'memberLogChannelId' }
		]
	},
	{
		id: 'messages',
		label: 'Messages',
		color: '#ffd817',
		events: [
			{ key: 'message.edit', label: 'Message edited', description: 'Message content edited.', defaultEnabled: true, legacyChannel: 'messageEditLogChannelId' },
			{ key: 'message.delete', label: 'Message deleted', description: 'Single message deleted.', defaultEnabled: true, legacyChannel: 'messageDeleteLogChannelId' },
			{ key: 'message.bulkDelete', label: 'Bulk delete', description: 'Multiple messages bulk-deleted.', defaultEnabled: true, legacyChannel: 'messageDeleteLogChannelId' }
		]
	},
	{
		id: 'voice',
		label: 'Voice',
		color: '#3ca2ff',
		events: [
			{ key: 'voice.join', label: 'Voice join', description: 'Member joined a voice channel.', defaultEnabled: false },
			{ key: 'voice.leave', label: 'Voice leave', description: 'Member left a voice channel.', defaultEnabled: false },
			{ key: 'voice.move', label: 'Voice move', description: 'Member moved between voice channels.', defaultEnabled: false }
		]
	},
	{
		id: 'server',
		label: 'Server',
		color: '#b388ff',
		events: [
			{ key: 'channel.create', label: 'Channel created', description: 'Channel created.', defaultEnabled: true },
			{ key: 'channel.delete', label: 'Channel deleted', description: 'Channel deleted.', defaultEnabled: true },
			{ key: 'channel.update', label: 'Channel updated', description: 'Channel name/topic/permissions changed.', defaultEnabled: false },
			{ key: 'role.create', label: 'Role created', description: 'Role created.', defaultEnabled: true },
			{ key: 'role.delete', label: 'Role deleted', description: 'Role deleted.', defaultEnabled: true },
			{ key: 'role.update', label: 'Role updated', description: 'Role name/color/permissions changed.', defaultEnabled: false },
			{ key: 'emoji.update', label: 'Emoji / sticker', description: 'Emoji or sticker added/removed.', defaultEnabled: false },
			{ key: 'invite.create', label: 'Invite created', description: 'Invite link created.', defaultEnabled: false },
			{ key: 'invite.delete', label: 'Invite deleted', description: 'Invite link deleted.', defaultEnabled: false },
			{ key: 'thread.update', label: 'Thread created / deleted', description: 'Thread created or deleted.', defaultEnabled: false }
		]
	},
	{
		id: 'automod',
		label: 'AutoMod',
		color: '#ff9e40',
		events: [{ key: 'automod.action', label: 'AutoMod action', description: 'Discord AutoMod rule triggered.', defaultEnabled: true, legacyChannel: 'modLogChannelId' }]
	}
];

export const LOG_EVENTS: Record<string, LogEventDef> = Object.fromEntries(
	LOG_EVENT_GROUPS.flatMap((g) => g.events.map((e) => [e.key, { ...e, group: g.id }]))
) as Record<string, LogEventDef>;

export const LOG_EVENT_KEYS: string[] = LOG_EVENT_GROUPS.flatMap((g) => g.events.map((e) => e.key));

export function getLogEventDef(key: string): (LogEventDef & { group: string }) | undefined {
	const [groupId, ...rest] = key.split('.');
	const group = LOG_EVENT_GROUPS.find((g) => g.id === groupId);
	const def = group?.events.find((e) => e.key === key);
	if (!def || !group) return undefined;
	return { ...def, group: group.id };
}

export function getGroupColor(key: string): string {
	const [groupId] = key.split('.');
	return LOG_EVENT_GROUPS.find((g) => g.id === groupId)?.color ?? '#3b66ff';
}

// ponytail: flat string-keyed maps (not nested subdocs) so PATCH validation stays trivial.
