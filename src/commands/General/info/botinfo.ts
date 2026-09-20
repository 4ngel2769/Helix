import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Client, EmbedBuilder, type ColorResolvable, type Message, version as discordJsVersion } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
    name: 'botinfo',
    description: 'Show bot information',
    aliases: ['info'],
    fullCategory: ['General'],
    enabled: true,
    flags: true
})
export class BotinfoCommand extends ModuleCommand<GeneralModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, { ...options, module: 'General', description: 'Show bot information', enabled: true });
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();
        try {
            return interaction.editReply({ embeds: [this.buildBotInfoEmbed(interaction.client)] });
        } catch (error) {
            this.container.logger.error('Error in botinfo:', error);
            return interaction.editReply({ content: 'An error occurred.' });
        }
    }

    public override async messageRun(message: Message) {
        try {
            return message.reply({ embeds: [this.buildBotInfoEmbed(message.client)] });
        } catch (error) {
            this.container.logger.error('Error in botinfo:', error);
            return message.reply('An error occurred.');
        }
    }

    private buildBotInfoEmbed(client: Client) {
        const user = client.user!;
        const shardCount = client.shard?.count ?? '—';
        const shardId = client.shard?.ids?.[0] ?? '—';

        return new EmbedBuilder()
            .setColor(config.bot.embedColor.helix as ColorResolvable)
            .setTitle('🤖 Helix')
            .setDescription('A feature-rich Discord bot built with Sapphire Framework')
            .setThumbnail(user.displayAvatarURL({ size: 128 }))
            .addFields(
                { name: 'Version', value: config.bot.version, inline: true },
                { name: 'Discord.js', value: discordJsVersion.split(' ')[0], inline: true },
                { name: 'Shard', value: `${shardId}/${shardCount}`, inline: true },
                { name: 'Servers', value: client.guilds.cache.size.toLocaleString(), inline: true },
                { name: 'Users', value: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0).toLocaleString(), inline: true },
                { name: 'Uptime', value: this.formatUptime(process.uptime()), inline: true },
                { name: 'Memory', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                { name: 'Prefix', value: `\`${config.bot.defaultPrefix}\``, inline: true }
            )
            .setFooter({ text: user.username, iconURL: user.displayAvatarURL({ size: 64 }) })
            .setTimestamp();
    }

    private formatUptime(seconds: number): string {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
    }
}
