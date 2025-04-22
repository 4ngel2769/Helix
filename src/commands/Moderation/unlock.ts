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
    name: 'unlock',
    description: 'Unlock a channel',
    preconditions: ['GuildOnly']
})
export class UnlockCommand extends ModuleCommand<ModerationModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Moderation',
            description: 'Unlock a channel',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('unlock')
                .setDescription('Unlock a channel')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('The channel to unlock')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('reason')
                        .setDescription('Reason for unlocking the channel')
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
            // Check if the channel is actually locked
            const isLocked = guildData?.lockedChannels?.some(lock => lock.channelId === channel.id);
            
            // Unlock the channel by removing the permission override
            await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
                SendMessages: null // Remove the override
            });

            // Create embed for notification
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('🔓 Channel Unlocked')
                .setDescription(`This channel has been unlocked by ${interaction.user}`)
                .addFields({ name: 'Reason', value: reason });

            // Send notification in the channel
            await channel.send({ embeds: [embed] });

            // If the channel was in the database, remove it
            if (isLocked) {
                await this.removeChannelLock(guildId, channel.id);
            }

            return interaction.reply({
                content: `Successfully unlocked ${channel}`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error unlocking channel:', error);
            return ErrorHandler.sendCommandError(
                interaction,
                'Failed to unlock the channel. Please check my permissions and try again.'
            );
        }
    }

    /**
     * Remove channel lock from database
     */
    private async removeChannelLock(guildId: string, channelId: string): Promise<void> {
        try {
            const guildData = await Guild.findOne({ guildId });
            if (!guildData || !guildData.lockedChannels) return;
            
            guildData.lockedChannels = guildData.lockedChannels.filter(
                lock => lock.channelId !== channelId
            );
            
            await guildData.save();
        } catch (error) {
            console.error('Error removing channel lock from database:', error);
        }
    }
}