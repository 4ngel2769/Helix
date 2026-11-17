import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import type { GuildSoundboardSound, PartialSoundboardSound } from 'discord.js';
import { sendLog } from '../../../lib/logging/logService';

export class SoundboardSoundDeleteLogListener extends Listener<typeof Events.GuildSoundboardSoundDelete> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) { super(context, { ...options, event: Events.GuildSoundboardSoundDelete }); }
	public override async run(sound: GuildSoundboardSound | PartialSoundboardSound) { if (!sound.guild) return; await sendLog(sound.guild, 'soundboard.update', { title: 'Soundboard sound deleted', description: `**${sound.name ?? 'Unknown sound'}** (${sound.soundId}) removed.` }); }
}
