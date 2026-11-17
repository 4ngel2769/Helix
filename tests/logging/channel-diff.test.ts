import { describe, expect, it } from 'bun:test';
import { getChannelChanges } from '../../src/lib/logging/channelDiff';

const channel = (values: Record<string, unknown>) => values as any;

describe('getChannelChanges', () => {
	it('reports changed common and type-specific channel fields', () => {
		const oldChannel = channel({ id: 'c', name: 'old', type: 0, topic: 'before', parentId: 'p1', rateLimitPerUser: 2, nsfw: false });
		const newChannel = channel({ id: 'c', name: 'new', type: 0, topic: 'after', parentId: 'p2', rateLimitPerUser: 5, nsfw: true });
		expect(getChannelChanges(oldChannel, newChannel)).toEqual([
			{ name: 'Name', before: 'old', after: 'new' },
			{ name: 'Topic', before: 'before', after: 'after' },
			{ name: 'Category', before: 'p1', after: 'p2' },
			{ name: 'Slowmode', before: '2s', after: '5s' },
			{ name: 'NSFW', before: 'No', after: 'Yes' }
		]);
	});

	it('reports voice fields and ignores unchanged or unavailable values', () => {
		const oldChannel = channel({ id: 'v', name: 'voice', type: 2, bitrate: 64000, userLimit: 4 });
		const newChannel = channel({ id: 'v', name: 'voice', type: 2, bitrate: 96000, userLimit: 4 });
		expect(getChannelChanges(oldChannel, newChannel)).toEqual([{ name: 'Bitrate', before: '64 kbps', after: '96 kbps' }]);
		expect(getChannelChanges(channel({ id: 'v', type: 2 }), channel({ id: 'v', type: 2 }))).toEqual([]);
	});

	it('reports overwrite additions, removals, and permission changes by stable identity', () => {
		const before = channel({ id: 'c', type: 0, permissionOverwrites: { cache: new Map([['r1', { id: 'r1', type: 0, allow: { bitfield: 1n }, deny: { bitfield: 0n } }]]) } });
		const after = channel({ id: 'c', type: 0, permissionOverwrites: { cache: new Map([
			['r1', { id: 'r1', type: 0, allow: { bitfield: 3n }, deny: { bitfield: 0n } }],
			['u2', { id: 'u2', type: 1, allow: { bitfield: 0n }, deny: { bitfield: 4n } }]
		]) } });
		expect(getChannelChanges(before, after)).toEqual([
			{ name: 'Permissions r1', before: 'allow 1 / deny 0', after: 'allow 3 / deny 0' },
			{ name: 'Permissions u2', before: '*none*', after: 'allow 0 / deny 4' }
		]);
	});

	it('does not report identical overwrite snapshots and handles absent snapshots', () => {
		const overwrites = new Map([['r1', { id: 'r1', type: 0, allow: { bitfield: 1n }, deny: { bitfield: 0n } }]]);
		expect(getChannelChanges(channel({ id: 'c', type: 0, permissionOverwrites: { cache: overwrites } }), channel({ id: 'c', type: 0, permissionOverwrites: { cache: new Map(overwrites) } }))).toEqual([]);
		expect(getChannelChanges(channel({ id: 'c', type: 0 }), channel({ id: 'c', type: 0, name: 'new' }))).toEqual([]);
	});
});
