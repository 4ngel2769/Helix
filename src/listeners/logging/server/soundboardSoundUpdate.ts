import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import type { GuildSoundboardSound } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class SoundboardSoundUpdateLogListener extends Listener<typeof Events.GuildSoundboardSoundUpdate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) { super(context, { ...options, event: Events.GuildSoundboardSoundUpdate }); }
	public override async run(oldSound: GuildSoundboardSound | null, sound: GuildSoundboardSound) {
		if (!oldSound || !sound.guild || oldSound.name === sound.name && oldSound.volume === sound.volume && oldSound.emoji?.name === sound.emoji?.name) return;
		const changes = [['Name', oldSound.name, sound.name], ['Volume', oldSound.volume, sound.volume], ['Emoji', oldSound.emoji?.name, sound.emoji?.name]].filter(([, before, after]) => before !== after);
		await sendLog(sound.guild, 'soundboard.update', { title: 'Soundboard sound updated', description: `**${sound.name}** (${sound.soundId}) updated.`, fields: changes.map(([name, before, after]) => ({ name: String(name), value: `Before: ${String(before ?? '*none*')}\nAfter: ${String(after ?? '*none*')}` })) });
	}
}
