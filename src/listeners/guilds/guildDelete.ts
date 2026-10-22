import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { EmbedBuilder, type Guild } from 'discord.js';
import config from '../../config';

@ApplyOptions<Listener.Options>({
    event: Events.GuildDelete
})
export class GuildDeleteListener extends Listener {
    public async run(guild: Guild) {
        // Mirror to the support server (same as legacy Helix).
        void (async () => {
            try {
                const serverLog = await this.container.client.channels.fetch(config.support.channels.serverLog).catch(() => null);
                if (serverLog && serverLog.isTextBased()) {
                    const embed = new EmbedBuilder()
                        .setDescription(`${this.container.client.user} has left **${guild.name}** ${config.support.emojis.fail}`)
                        .setColor(0xff0000);
                    await (serverLog as { send: (m: unknown) => Promise<unknown> }).send({ embeds: [embed] });
                }
            } catch {
                // ignore
            }
        })();
    }
}
