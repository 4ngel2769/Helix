import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Client, EmbedBuilder, type ColorResolvable, type Message, version as discordJsVersion } from 'discord.js';
import config from '../../../config';
import { Guild } from '../../../models/Guild';
import { getGuildPrefixFromCache, setGuildPrefixInCache } from '../../../lib/utils/prefixCache';

@ApplyOptions<Command.Options>({
    name: 'botinfo',
    description: 'Show bot information',
    aliases: ['info', 'bot', 'bi'],
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
            return interaction.editReply({ embeds: [await this.buildBotInfoEmbed(interaction.client, interaction.guildId)] });
        } catch (error) {
            this.container.logger.error('Error in botinfo:', error);
            return interaction.editReply({ content: 'An error occurred.' });
        }
    }

    public override async messageRun(message: Message) {
        try {
            return message.reply({ embeds: [await this.buildBotInfoEmbed(message.client, message.guildId)] });
        } catch (error) {
            this.container.logger.error('Error in botinfo:', error);
            return message.reply('An error occurred.');
        }
    }

    private async buildBotInfoEmbed(client: Client, guildId: string | null): Promise<EmbedBuilder> {
        const user = client.user!;
        const prefix = await this.resolvePrefix(guildId);
        const shardCount = client.shard?.count ?? '—';
        const shardId = client.shard?.ids?.[0] ?? '—';
        const inviteLink = `https://discord.com/oauth2/authorize?client_id=${user.id}&scope=bot+applications.commands&permissions=8`;

        return new EmbedBuilder()
            .setColor(config.bot.embedColor.helix as ColorResolvable)
            .setTitle("🤖 Helix's Information")
            .setDescription(
                '**Helix** is pretty much a do-it-all bot! It provides a wide variety of commands and features.\n' +
                'Developed by **Angel** and **Eve** for entertaining and helping users across Discord! 😃\n' +
                'For live metrics and more information, use `/stats`.'
            )
            .setThumbnail(user.displayAvatarURL({ size: 128 }))
            .addFields(
                { name: 'Current guild prefix', value: `\`${prefix}\``, inline: true },
                { name: 'Client ID', value: `\`${user.id}\``, inline: true },
                { name: 'Developers', value: '**Angel**, **Eve**', inline: true },
                { name: 'Servers', value: client.guilds.cache.size.toLocaleString(), inline: true },
                { name: 'Users', value: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0).toLocaleString(), inline: true },
                { name: 'Uptime', value: this.formatUptime(process.uptime()), inline: true },
                { name: 'Memory', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                { name: 'Shard', value: `${shardId}/${shardCount}`, inline: true },
                {
                    name: 'Internal Information',
                    value:
                        `**Version** \`v${config.bot.version}\`\n` +
                        `**Bot Library** \`discord.js v${discordJsVersion.split(' ')[0]}\`\n` +
                        '**Database** `MongoDB (Mongoose)`\n' +
                        '**Runtime** `Bun + TypeScript + Sapphire`',
                    inline: false
                },
                {
                    name: 'Links',
                    value: `[Invite Helix](${inviteLink}) | [Support Server](${config.support.invite})`,
                    inline: false
                }
            )
            .setFooter({ text: user.username, iconURL: user.displayAvatarURL({ size: 64 }) })
            .setTimestamp();
    }

    private async resolvePrefix(guildId: string | null): Promise<string> {
        const configuredDefaultPrefix = this.container.client.options.defaultPrefix;
        const defaultPrefix =
            (Array.isArray(configuredDefaultPrefix) ? configuredDefaultPrefix[0] : configuredDefaultPrefix) ||
            config.bot.defaultPrefix ||
            'x';

        if (!guildId) return defaultPrefix;

        const cached = getGuildPrefixFromCache(guildId);
        if (cached) return cached;

        try {
            const guildData = await Guild.findOne({ guildId }, { prefix: 1 }).lean();
            const resolvedPrefix = guildData?.prefix || defaultPrefix;
            setGuildPrefixInCache(guildId, resolvedPrefix);
            return resolvedPrefix;
        } catch {
            return defaultPrefix;
        }
    }

    private formatUptime(seconds: number): string {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
    }
}
