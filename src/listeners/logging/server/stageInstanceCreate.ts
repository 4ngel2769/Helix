import { Events, Listener } from '@sapphire/framework';
import type { StageInstance } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class StageInstanceCreateLogListener extends Listener<typeof Events.StageInstanceCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) { super(context, { ...options, event: Events.StageInstanceCreate }); }
	public override async run(stage: StageInstance) { if (!stage.guild) return; await sendLog(stage.guild, 'stage.update', { title: 'Stage started', description: `Stage **${stage.topic}** started in <#${stage.channelId}>.`, fields: [{ name: 'Privacy', value: stage.privacyLevel.toString(), inline: true }] }); }
}
