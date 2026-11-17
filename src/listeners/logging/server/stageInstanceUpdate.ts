import { Events, Listener } from '@sapphire/framework';
import type { StageInstance } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class StageInstanceUpdateLogListener extends Listener<typeof Events.StageInstanceUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) { super(context, { ...options, event: Events.StageInstanceUpdate }); }
	public override async run(oldStage: StageInstance | null, stage: StageInstance) {
		if (!oldStage || !stage.guild || (oldStage.topic === stage.topic && oldStage.privacyLevel === stage.privacyLevel)) return;
		const fields = [];
		if (oldStage.topic !== stage.topic) fields.push({ name: 'Topic', value: `Before: ${oldStage.topic}\nAfter: ${stage.topic}` });
		if (oldStage.privacyLevel !== stage.privacyLevel) fields.push({ name: 'Privacy', value: `Before: ${oldStage.privacyLevel}\nAfter: ${stage.privacyLevel}` });
		await sendLog(stage.guild, 'stage.update', { title: 'Stage updated', description: `Stage in <#${stage.channelId}> updated.`, fields });
	}
}
