import type { GuildBasedChannel } from 'discord.js';

export interface ChannelChange {
	name: string;
	before: string;
	after: string;
}

function display(value: unknown): string | null {
	if (typeof value === 'string') return value || '*empty*';
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	if (typeof value === 'boolean') return value ? 'Yes' : 'No';
	return null;
}

function addChange(changes: ChannelChange[], name: string, before: unknown, after: unknown, format: (value: unknown) => string | null = display): void {
	const oldValue = format(before);
	const newValue = format(after);
	if (oldValue !== null && newValue !== null && oldValue !== newValue) changes.push({ name, before: oldValue, after: newValue });
}

function overwriteSnapshot(channel: GuildBasedChannel): Map<string, string> | null {
	const overwrites = (channel as GuildBasedChannel & { permissionOverwrites?: { cache?: Map<string, any> } }).permissionOverwrites?.cache;
	if (!(overwrites instanceof Map)) return null;
	const result = new Map<string, string>();
	for (const overwrite of overwrites.values()) {
		if (!overwrite || typeof overwrite.id !== 'string') continue;
		const allow = overwrite.allow?.bitfield;
		const deny = overwrite.deny?.bitfield;
		if (allow === undefined || deny === undefined) continue;
		result.set(`${overwrite.type}:${overwrite.id}`, `allow ${String(allow)} / deny ${String(deny)}`);
	}
	return result;
}

/** Extract changed details common to Discord guild channel variants, omitting uncached values. */
export function getChannelChanges(oldChannel: GuildBasedChannel, newChannel: GuildBasedChannel): ChannelChange[] {
	const oldValue = oldChannel as GuildBasedChannel & Record<string, any>;
	const newValue = newChannel as GuildBasedChannel & Record<string, any>;
	const changes: ChannelChange[] = [];
	addChange(changes, 'Name', oldValue.name, newValue.name);
	addChange(changes, 'Topic', oldValue.topic, newValue.topic, (value) => value === null ? '*none*' : display(value));
	addChange(changes, 'Category', oldValue.parentId, newValue.parentId, (value) => value === null ? '*none*' : display(value));
	addChange(changes, 'Slowmode', oldValue.rateLimitPerUser, newValue.rateLimitPerUser, (value) => typeof value === 'number' ? `${value}s` : null);
	addChange(changes, 'NSFW', oldValue.nsfw, newValue.nsfw, (value) => typeof value === 'boolean' ? (value ? 'Yes' : 'No') : null);
	addChange(changes, 'Bitrate', oldValue.bitrate, newValue.bitrate, (value) => typeof value === 'number' ? `${Math.round(value / 1000)} kbps` : null);
	addChange(changes, 'User limit', oldValue.userLimit, newValue.userLimit, (value) => typeof value === 'number' ? (value === 0 ? 'Unlimited' : String(value)) : null);
	addChange(changes, 'Default thread slowmode', oldValue.defaultThreadRateLimitPerUser, newValue.defaultThreadRateLimitPerUser, (value) => typeof value === 'number' ? `${value}s` : null);
	addChange(changes, 'Video quality mode', oldValue.videoQualityMode, newValue.videoQualityMode);
	const oldOverwrites = overwriteSnapshot(oldChannel);
	const newOverwrites = overwriteSnapshot(newChannel);
	if (oldOverwrites && newOverwrites) {
		const ids = new Set([...oldOverwrites.keys(), ...newOverwrites.keys()]);
		for (const id of ids) {
			const before = oldOverwrites.get(id) ?? '*none*';
			const after = newOverwrites.get(id) ?? '*none*';
			if (before !== after) changes.push({ name: `Permissions ${id.split(':')[1]}`.slice(0, 256), before, after });
		}
	}
	return changes;
}
