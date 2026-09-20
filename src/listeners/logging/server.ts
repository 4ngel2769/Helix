import { Events, Listener } from '@sapphire/framework';
import type {
	AnyThreadChannel,
	Channel,
	DMChannel,
	Guild,
	GuildEmoji,
	Invite,
	NonThreadGuildBasedChannel,
	Role
} from 'discord.js';
import { sendLog } from '../../lib/logging/logService';

function guildChannel(channel: Channel): (NonThreadGuildBasedChannel & { guild: Guild }) | null {
	if (channel.isDMBased()) return null;
	const guild = (channel as Partial<NonThreadGuildBasedChannel>).guild;
	return guild ? (channel as NonThreadGuildBasedChannel & { guild: Guild }) : null;
}

export class ChannelCreateListener extends Listener<typeof Events.ChannelCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.ChannelCreate });
	}
	public override async run(channel: NonThreadGuildBasedChannel) {
		await sendLog(channel.guild, 'channel.create', {
			description: `Channel <#${channel.id}> (**${channel.name}**) created.`
		});
	}
}

export class ChannelDeleteListener extends Listener<typeof Events.ChannelDelete> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.ChannelDelete });
	}
	public override async run(channel: DMChannel | NonThreadGuildBasedChannel) {
		const gc = guildChannel(channel);
		if (!gc) return;
		await sendLog(gc.guild, 'channel.delete', {
			description: `Channel **${gc.name}** (${gc.id}) deleted.`
		});
	}
}

export class ChannelUpdateListener extends Listener<typeof Events.ChannelUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.ChannelUpdate });
	}
	public override async run(oldChannel: DMChannel | NonThreadGuildBasedChannel, newChannel: DMChannel | NonThreadGuildBasedChannel) {
		const gc = guildChannel(newChannel);
		if (!gc) return;
		const oldName = 'name' in oldChannel ? (oldChannel.name as string) : null;
		if (oldName === gc.name) return; // permission overwrites etc. — skip noise for now
		await sendLog(gc.guild, 'channel.update', {
			description: `Channel <#${gc.id}> renamed.`,
			fields: [
				{ name: 'Before', value: oldName ?? '*unknown*', inline: true },
				{ name: 'After', value: gc.name, inline: true }
			]
		});
	}
}

export class RoleCreateListener extends Listener<typeof Events.GuildRoleCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildRoleCreate });
	}
	public override async run(role: Role) {
		await sendLog(role.guild, 'role.create', {
			description: `Role <@&${role.id}> (**${role.name}**) created.`
		});
	}
}

export class RoleDeleteListener extends Listener<typeof Events.GuildRoleDelete> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildRoleDelete });
	}
	public override async run(role: Role) {
		await sendLog(role.guild, 'role.delete', {
			description: `Role **${role.name}** (${role.id}) deleted.`
		});
	}
}

export class RoleUpdateListener extends Listener<typeof Events.GuildRoleUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildRoleUpdate });
	}
	public override async run(oldRole: Role, newRole: Role) {
		if (oldRole.name === newRole.name && oldRole.hexColor === newRole.hexColor) return;
		await sendLog(newRole.guild, 'role.update', {
			description: `Role <@&${newRole.id}> updated.`,
			fields: [
				{ name: 'Before', value: `${oldRole.name} (${oldRole.hexColor})`, inline: true },
				{ name: 'After', value: `${newRole.name} (${newRole.hexColor})`, inline: true }
			]
		});
	}
}

export class InviteCreateListener extends Listener<typeof Events.InviteCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.InviteCreate });
	}
	public override async run(invite: Invite) {
		if (!invite.guild || !('channels' in invite.guild)) return;
		const guild = invite.guild as Guild;
		await sendLog(guild, 'invite.create', {
			description: `Invite \`${invite.code}\` created${invite.inviter ? ` by **${invite.inviter.tag}**` : ''} for <#${invite.channelId}>.`,
			actorId: invite.inviter?.id
		});
	}
}

export class InviteDeleteListener extends Listener<typeof Events.InviteDelete> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.InviteDelete });
	}
	public override async run(invite: Invite) {
		if (!invite.guild || !('channels' in invite.guild)) return;
		await sendLog(invite.guild as Guild, 'invite.delete', {
			description: `Invite \`${invite.code}\` deleted.`
		});
	}
}

export class ThreadCreateListener extends Listener<typeof Events.ThreadCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.ThreadCreate });
	}
	public override async run(thread: AnyThreadChannel) {
		if (!thread.guild) return;
		await sendLog(thread.guild, 'thread.update', {
			description: `Thread **${thread.name}** (<#${thread.id}>) created in <#${thread.parentId}>.`
		});
	}
}

export class ThreadDeleteListener extends Listener<typeof Events.ThreadDelete> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.ThreadDelete });
	}
	public override async run(thread: AnyThreadChannel) {
		if (!thread.guild) return;
		await sendLog(thread.guild, 'thread.update', {
			description: `Thread **${thread.name}** (${thread.id}) deleted.`
		});
	}
}

export class EmojiCreateListener extends Listener<typeof Events.GuildEmojiCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildEmojiCreate });
	}
	public override async run(emoji: GuildEmoji) {
		await sendLog(emoji.guild, 'emoji.update', {
			description: `Emoji ${emoji.name} (${emoji.id}) added.`
		});
	}
}

export class EmojiDeleteListener extends Listener<typeof Events.GuildEmojiDelete> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.GuildEmojiDelete });
	}
	public override async run(emoji: GuildEmoji) {
		await sendLog(emoji.guild, 'emoji.update', {
			description: `Emoji ${emoji.name} (${emoji.id}) removed.`
		});
	}
}
