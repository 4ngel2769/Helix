import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { 
    ChannelType, 
    ColorResolvable, 
    EmbedBuilder, 
    GuildMember, 
    PermissionFlagsBits,
    TextChannel,
    MessageFlags
} from 'discord.js';
import { Guild } from '../../models/Guild';
import { ErrorHandler } from '../../lib/structures/ErrorHandler';
import config from '../../config';

@ApplyOptions<Command.Options>({
    name: 'lock',
    description: 'Lock a channel',
    preconditions: ['GuildOnly']
})
export class LockCommand extends ModuleCommand<ModerationModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Moderation',
            description: 'Lock a channel',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('lock')
                .setDescription('Lock a channel')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('The channel to lock')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('reason')
                        .setDescription('Reason for locking the channel')
                        .setRequired(false)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const guildId = interaction.guildId!;
        const guildData = await Guild.findOne({ guildId });

        // Check if user has mod role or required permissions
        const member = interaction.member;
        const hasModRole = guildData?.modRoleId && (member as GuildMember)?.roles?.cache.has(guildData.modRoleId);
        
        if (!hasModRole && !(member as GuildMember)?.permissions?.has(PermissionFlagsBits.ManageChannels)) {
            return ErrorHandler.sendModeratorError(interaction);
        }

        const channel = interaction.options.getChannel('channel', true) as TextChannel;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
                SendMessages: false
            });

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('🔒 Channel Locked')
                .setDescription(`This channel has been locked by ${interaction.user}`)
                .addFields({ name: 'Reason', value: reason });

            await channel.send({ embeds: [embed] });

            return interaction.reply({
                content: `Successfully locked ${channel}`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            return ErrorHandler.sendCommandError(
                interaction,
                'Failed to lock the channel. Please check my permissions and try again.'
            );
        }
    }
} 