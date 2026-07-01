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
            // Check if guild data already exists
            const existingGuild = await GuildModel.findOne({ guildId: guild.id });
            
            if (!existingGuild) {
                // Create default guild data - modules initialized via schema default
                const newGuild = new GuildModel({ guildId: guild.id });
                
                await newGuild.save();
                this.container.logger.info(`Created default settings for new guild: ${guild.name} (${guild.id})`);
            }
        } catch (error) {
            this.container.logger.error(`Failed to create default settings for guild ${guild.id}:`, error as Error);
        }
    }
}