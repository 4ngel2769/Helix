import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import type { Guild } from 'discord.js';
import { Guild as GuildModel } from '../../models/Guild';

@ApplyOptions<Listener.Options>({
    event: Events.GuildCreate
})
export class GuildCreateListener extends Listener {
    public async run(guild: Guild) {
        try {
            const result = await GuildModel.updateOne(
                { guildId: guild.id },
                { $setOnInsert: { guildId: guild.id } },
                { upsert: true }
            );
            if (result.upsertedCount > 0) {
                this.container.logger.info(`Created default settings for new guild: ${guild.name} (${guild.id})`);
            }
        } catch (error) {
            this.container.logger.error(`Failed to create default settings for guild ${guild.id}:`, error as Error);
        }
    }
}