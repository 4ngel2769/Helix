import { Events, Listener } from '@sapphire/framework';
import type { Guild } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class GuildUpdateLogListener extends Listener<typeof Events.GuildUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) { super(context, { ...options, event: Events.GuildUpdate }); }
	public override async run(oldGuild: Guild, newGuild: Guild) {
		const changes = [['Name', oldGuild.name, newGuild.name], ['Description', oldGuild.description, newGuild.description], ['Preferred locale', oldGuild.preferredLocale, newGuild.preferredLocale], ['Verification level', oldGuild.verificationLevel, newGuild.verificationLevel], ['Content filter', oldGuild.explicitContentFilter, newGuild.explicitContentFilter], ['Notifications', oldGuild.defaultMessageNotifications, newGuild.defaultMessageNotifications], ['Vanity URL', oldGuild.vanityURLCode, newGuild.vanityURLCode], ['Icon', oldGuild.icon, newGuild.icon]].filter(([, before, after]) => before !== after);
		if (!changes.length) return;
		await sendLog(newGuild, 'guild.update', { description: 'Server settings updated.', fields: changes.map(([name, before, after]) => ({ name: String(name), value: `Before: ${String(before ?? '*none*')}\nAfter: ${String(after ?? '*none*')}` })) });
	}
}
