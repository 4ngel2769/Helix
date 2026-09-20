import { Events, Listener } from '@sapphire/framework';
import type { AutoModerationActionExecution } from 'discord.js';
import { sendLog } from '../../lib/logging/logService';

export class AutoModActionListener extends Listener<typeof Events.AutoModerationActionExecution> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.AutoModerationActionExecution });
	}

	public override async run(execution: AutoModerationActionExecution) {
		if (!execution.guild || !execution.user) return;
		const content = (execution.content ?? '').trim().slice(0, 500);
		await sendLog(execution.guild, 'automod.action', {
			description: `AutoMod flagged a message by <@${execution.user.id}> in <#${execution.channel?.id ?? 'unknown'}>.`,
			fields: [
				...(content ? [{ name: 'Content', value: content }] : []),
				...(execution.matchedKeyword ? [{ name: 'Matched', value: execution.matchedKeyword.slice(0, 500) }] : [])
			],
			targetId: execution.user.id,
			contextChannelId: execution.channel?.id,
			isBot: execution.user.bot
		});
	}
}
