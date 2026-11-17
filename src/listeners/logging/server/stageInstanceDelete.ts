import { Events, Listener } from '@sapphire/framework';
import type { StageInstance } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class StageInstanceDeleteLogListener extends Listener<typeof Events.StageInstanceDelete> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) { super(context, { ...options, event: Events.StageInstanceDelete }); }
	public override async run(stage: StageInstance) { if (!stage.guild) return; await sendLog(stage.guild, 'stage.update', { title: 'Stage ended', description: `Stage **${stage.topic}** ended in <#${stage.channelId}>.` }); }
}
