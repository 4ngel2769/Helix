import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import type { GuildSoundboardSound } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class SoundboardSoundCreateLogListener extends Listener<typeof Events.GuildSoundboardSoundCreate> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) { super(context, { ...options, event: Events.GuildSoundboardSoundCreate }); }
	public override async run(sound: GuildSoundboardSound) { if (!sound.guild) return; await sendLog(sound.guild, 'soundboard.update', { title: 'Soundboard sound created', description: `**${sound.name}** (${sound.soundId}) added.` }); }
}
