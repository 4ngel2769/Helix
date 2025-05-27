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
    MessageFlags,
    User
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
                .addStringOption((option) =>
                    option
                        .setName('time')
                        .setDescription('Duration for the lock (e.g. 10m, 1h, 30s). Default unit is minutes.')
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
        const timeInput = interaction.options.getString('time');
        
        // Parse time duration if provided
        let durationMs = 0;
        let durationText = '';
        
        if (timeInput) {
            const { milliseconds, text } = this.parseTime(timeInput);
            durationMs = milliseconds;
            durationText = text;
        }

        try {
            await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
                SendMessages: false
            });

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success as ColorResolvable)
                .setTitle('🔒 Channel Locked')
                .setDescription(`This channel has been locked by ${interaction.user}`)
                .addFields({ name: 'Reason', value: reason });

            // Add duration field if time was specified
            if (durationMs > 0) {
                embed.addFields({ 
                    name: 'Duration', 
                    value: durationText,
                    inline: true 
                });
                
                // Add unlock time field
                const unlockTime = new Date(Date.now() + durationMs);
                embed.addFields({ 
                    name: 'Unlocks At', 
                    value: `<t:${Math.floor(unlockTime.getTime() / 1000)}:F>`,
                    inline: true 
                });
                
                // Save lock information to database
                await this.saveLockToDatabase(
                    guildId, 
                    channel.id, 
                    Date.now(), 
                    durationMs,
                    interaction.user
                );
            }

            await channel.send({ embeds: [embed] });

            return interaction.reply({
                content: `Successfully locked ${channel}${durationMs > 0 ? ` for ${durationText}` : ''}`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            return ErrorHandler.sendCommandError(
                interaction,
                'Failed to lock the channel. Please check my permissions and try again.'
            );
        }
    }
    
    /**
     * Parse time input string into milliseconds
     * Accepts formats like: 10m, 1h, 30s, 10mins, 2hrs, etc.
     */
    private parseTime(timeInput: string): { milliseconds: number, text: string } {
        // Extract number and unit
        const match = timeInput.match(/^(\d+)([smh]|min|mins|hour|hours|hr|hrs|sec|secs)?$/i);
        
        if (!match) {
            // Try to extract just the number and first letter
            const numericMatch = timeInput.match(/^(\d+)([a-zA-Z])?/);
            if (!numericMatch) return { milliseconds: 0, text: '' };
            
            const num = parseInt(numericMatch[1]);
            const unit = numericMatch[2]?.toLowerCase() || 'm'; // Default to minutes
            
            return this.calculateTime(num, unit);
        }
        
        const num = parseInt(match[1]);
        let unit = match[2]?.toLowerCase() || 'm'; // Default to minutes
        
        // Convert longer unit names to single letter
        if (['min', 'mins'].includes(unit)) unit = 'm';
        else if (['hour', 'hours', 'hr', 'hrs'].includes(unit)) unit = 'h';
        else if (['sec', 'secs'].includes(unit)) unit = 's';
        
        return this.calculateTime(num, unit);
    }
    
    /**
     * Calculate milliseconds and formatted text from number and unit
     */
    private calculateTime(num: number, unit: string): { milliseconds: number, text: string } {
        let milliseconds = 0;
        let text = '';
        
        switch (unit) {
            case 's':
                milliseconds = num * 1000;
                text = `${num} second${num !== 1 ? 's' : ''}`;
                break;
            case 'h':
                milliseconds = num * 60 * 60 * 1000;
                text = `${num} hour${num !== 1 ? 's' : ''}`;
                break;
            case 'm':
            default:
                milliseconds = num * 60 * 1000;
                text = `${num} minute${num !== 1 ? 's' : ''}`;
                break;
        }
        
        return { milliseconds, text };
    }
    
    /**
     * Save lock information to the database
     */
    private async saveLockToDatabase(
        guildId: string, 
        channelId: string, 
        lockTimestamp: number, 
        durationMs: number,
        moderator: User
    ): Promise<void> {
        try {
            let guildData = await Guild.findOne({ guildId });
            
            if (!guildData) {
                guildData = new Guild({ guildId });
            }
            
            // Initialize lockedChannels array if it doesn't exist
            if (!guildData.lockedChannels) {
                guildData.lockedChannels = [];
            }
            
            // Add or update locked channel info
            const existingLockIndex = guildData.lockedChannels.findIndex(
                lock => lock.channelId === channelId
            );
            
            const lockInfo = {
                channelId,
                originalPermissions: [], // This should be populated from actual channel data when locking
                lockedBy: moderator.id,
                lockedAt: new Date(),
                reason: '',
                lockTimestamp,
                duration: durationMs,
                unlockTimestamp: durationMs ? lockTimestamp + durationMs : 0,
                moderator: {
                    id: moderator.id,
                    tag: moderator.tag
                }
            };

            if (existingLockIndex >= 0) {
                guildData.lockedChannels[existingLockIndex] = lockInfo;
            } else {
                guildData.lockedChannels.push(lockInfo);
            }
            
            await guildData.save();
            
            // Schedule unlock
            if (durationMs > 0) {
                this.scheduleUnlock(guildId, channelId, durationMs);
            }
            
        } catch (error) {
            console.error('Error saving lock to database:', error);
        }
    }
    
    /**
     * Schedule channel unlock after the specified duration
     */
    private scheduleUnlock(guildId: string, channelId: string, durationMs: number): void {
        setTimeout(async () => {
            try {
                const guild = this.container.client.guilds.cache.get(guildId);
                if (!guild) return;
                
                const channel = guild.channels.cache.get(channelId) as TextChannel;
                if (!channel) return;
                
                // Unlock the channel
                await channel.permissionOverwrites.edit(guild.roles.everyone, {
                    SendMessages: null
                });
                
                // Send unlock notification
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.success as ColorResolvable)
                    .setTitle('🔓 Channel Unlocked')
                    .setDescription('This channel has been automatically unlocked.');
                
                await channel.send({ embeds: [embed] });
                
                // Remove from database
                await this.removeChannelLock(guildId, channelId);
                
            } catch (error) {
                console.error('Error unlocking channel:', error);
            }
        }, durationMs);
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