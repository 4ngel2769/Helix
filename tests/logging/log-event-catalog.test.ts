import { describe, expect, it } from 'bun:test';
import { LOG_EVENT_GROUPS, LOG_EVENT_KEYS } from '../../src/lib/logging/logEvents';
import { getPublicLogEventGroups } from '../../src/lib/logging/publicLogEventGroups';

describe('logging event catalog', () => {
	it('defines each accepted logging event key in exactly one group', () => {
		const groupedKeys = LOG_EVENT_GROUPS.flatMap((group) => group.events.map((event) => event.key));
		expect(new Set(groupedKeys).size).toBe(groupedKeys.length);
		expect([...groupedKeys].sort()).toEqual([...LOG_EVENT_KEYS].sort());
	});

	it('exposes the canonical definitions as detached public config metadata', () => {
		const publicGroups = getPublicLogEventGroups();
		expect(publicGroups).toEqual(LOG_EVENT_GROUPS);
		expect(publicGroups).not.toBe(LOG_EVENT_GROUPS);
		expect(publicGroups[0]).not.toBe(LOG_EVENT_GROUPS[0]);
	});

	it('does not share event records with internal logging configuration', () => {
		const publicGroups = getPublicLogEventGroups();
		expect(publicGroups[0]?.events[0]).not.toBe(LOG_EVENT_GROUPS[0]?.events[0]);
	});
});
