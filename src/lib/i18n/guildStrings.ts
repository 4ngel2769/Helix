import { CustomMessage } from '../../models/customMessages';
import { Guild } from '../../models/Guild';
import { MessageKit } from '../../models/MessageKit';
import { DEFAULT_LOCALE, isLocale, type Locale, type StringSource } from './index';
import { scrubMessages } from '../kits/validation';

export interface GuildStrings extends StringSource {
	locale: Locale;
	kit: Record<string, string>;
	overrides: Record<string, string>;
}

const TTL_MS = 60_000;

const EMPTY_STRINGS: GuildStrings = { locale: DEFAULT_LOCALE, kit: Object.create(null), overrides: Object.create(null) };

interface Cached {
	value: GuildStrings;
	expiresAt: number;
}

const cache = new Map<string, Cached>();

/**
 * Per-guild locale + active kit + ad-hoc overrides, cached for a minute like
 * prefixCache / guildAutomationCache so a reply costs no database read on a hit.
 *
 * `CustomMessage` was write-only before this — the dashboard could save messages
 * but nothing ever read them back. This is that missing reader.
 */
export async function getGuildStrings(guildId: string | null | undefined): Promise<GuildStrings> {
	if (!guildId) return EMPTY_STRINGS;
	const hit = cache.get(guildId);
	if (hit && hit.expiresAt > Date.now()) return hit.value;
	if (hit) cache.delete(guildId);

	try {
		const guild = await Guild.findOne({ guildId }, { locale: 1, activeKitId: 1 }).lean();

		let messages: Record<string, string> = Object.create(null);
		if (guild?.activeKitId) {
			const kitDoc = await MessageKit.findOne({ kitId: guild.activeKitId }).lean();
			if (kitDoc) messages = scrubMessages(Object.fromEntries((kitDoc.messages ?? new Map()) as Map<string, string>));
		}

		const custom = await CustomMessage.findOne({ guildId }).lean();

		const value: GuildStrings = {
			locale: isLocale(guild?.locale) ? guild.locale : DEFAULT_LOCALE,
			kit: messages,
			overrides: scrubMessages(Object.fromEntries((custom?.messages ?? new Map()) as Map<string, string>))
		};
		cache.set(guildId, { value, expiresAt: Date.now() + TTL_MS });
		return value;
	} catch {
		return EMPTY_STRINGS;
	}
}

/** Call after any write to a guild's locale, kit or custom messages. */
export function clearGuildStrings(guildId: string): void {
	cache.delete(guildId);
}
