import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { EmbedBuilder, type Guild } from 'discord.js';
import { Guild as GuildModel } from '../../models/Guild';
import config from '../../config';

@ApplyOptions<Listener.Options>({
    event: Events.GuildCreate
})
export class GuildCreateListener extends Listener {
    public async run(guild: Guild) {
        void (async () => {
            try {
                const announce = await this.container.client.channels.fetch(config.support.channels.guildAnnounce).catch(() => null);
                if (announce && announce.isTextBased()) {
                    await (announce as { send: (m: unknown) => Promise<unknown> }).send(
                        `📥 I've been added to a new server! I am now in ${this.container.client.guilds.cache.size} servers! ${config.support.emojis.blobdance}`
                    );
                }
                const serverLog = await this.container.client.channels.fetch(config.support.channels.serverLog).catch(() => null);
                if (serverLog && serverLog.isTextBased()) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${this.container.client.user} has joined **${guild.name}** ${config.support.emojis.success}`)
                        .setColor(0x46ff2e);
                    await (serverLog as { send: (m: unknown) => Promise<unknown> }).send({ embeds: [embed] });
                }
            } catch {
                // ignore
            }
        })();

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