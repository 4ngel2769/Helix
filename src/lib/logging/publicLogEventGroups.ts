import { LOG_EVENT_GROUPS } from './logEvents';

/** Public, JSON-safe logging controls for authenticated guild configuration clients. */
export function getPublicLogEventGroups() {
	return LOG_EVENT_GROUPS.map((group) => ({
		...group,
		events: group.events.map((event) => ({ ...event }))
	}));
}
