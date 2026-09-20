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
            const existing = await GuildModel.findOne({ guildId: guild.id }, { guildBanned: 1 }).lean();
            if (existing?.guildBanned) {
                this.container.logger.warn(`Refusing banned guild ${guild.name} (${guild.id})`);
                await guild.leave().catch(() => null);
                return;
            }
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