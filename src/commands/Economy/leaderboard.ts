import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ColorResolvable,
    ButtonInteraction,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder
} from 'discord.js';
import type { PipelineStage } from 'mongoose';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import { EconomyModule } from '../../modules/Economy';
import { EconomyService } from '../../lib/services/EconomyService';
import { User, type IUser } from '../../models/User';
import config from '../../config';

interface LeaderboardUser {
    userId: string;
    economy?: {
        wallet?: number;
        bank?: number;
        level?: number;
        experience?: number;
    };
}

type LeaderboardType = 'total' | 'wallet' | 'bank' | 'level';

@ApplyOptions<Command.Options>({
    name: 'leaderboard-bank',
    description: 'View the economy leaderboard',
    aliases: ['econ-lb', 'richest', 'rich', 'wealth-board']
})
export class EconomyLeaderboardCommand extends ModuleCommand<EconomyModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Economy',
            description: 'View the economy leaderboard'
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('leaderboard-bank')
                .setDescription('View the economy leaderboard')
                .setContexts(0, 1, 2)
                .setIntegrationTypes(0, 1)
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Type of leaderboard to view')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Total Money (Wallet + Bank)', value: 'total' },
                            { name: 'Wallet Only', value: 'wallet' },
                            { name: 'Bank Only', value: 'bank' },
                            { name: 'Level', value: 'level' }
                        )
                )
                .addBooleanOption(option =>
                    option
                        .setName('global')
                        .setDescription('Show global leaderboard (default: server only)')
                        .setRequired(false)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const type = interaction.options.getString('type') as 'total' | 'wallet' | 'bank' | 'level' || 'total';
            const isGlobal = interaction.options.getBoolean('global') || false;
            const guildId = interaction.guildId;

            // Get user's current economy data first to ensure they're in the system
            const currentUser = await EconomyService.getUser(interaction.user.id, interaction.user.username);

            // Get leaderboard data
            const leaderboardData = await this.getLeaderboard(type, isGlobal, guildId);
            
            if (!leaderboardData || leaderboardData.length === 0) {
                // Create a starter embed that includes the current user
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.warn as ColorResolvable)
                    .setTitle('📊 Economy Leaderboard')
                    .setDescription(
                        '🎯 **Getting Started!**\n\n' +
                        'No other users have participated in the economy yet!\n' +
                        'You can be one of the first by using economy commands like:\n\n' +
                        '• `/daily` - Get your daily coins\n' +
                        '• `/balance` - Check your balance\n' +
                        '• `/shop` - Visit the shop\n' +
                        '• `/work` - Earn more coins (if available)\n\n' +
                        'Start building your wealth and others will follow!'
                    )
                    .addFields({
                        name: 'Your Current Stats',
                        value: this.formatUserStats(currentUser, type),
                        inline: false
                    })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            // Find user's position
            const userPosition = this.findUserPosition(leaderboardData, interaction.user.id, type);

            // Create embed
            const embed = await this.createLeaderboardEmbed(
                leaderboardData.slice(0, 20), 
                type, 
                isGlobal, 
                currentUser, 
                userPosition,
                guildId ? interaction.guild?.name || 'Unknown Server' : 'Global'
            );

            // Create control buttons
            const components = this.createComponents(type, isGlobal);

            const response = await interaction.editReply({ 
                embeds: [embed], 
                components 
            });

            // Set up collector for interactions
            const collector = response.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 300000 // 5 minutes
            });

            collector.on('collect', async (i: ButtonInteraction | StringSelectMenuInteraction) => {
                try {
                    if (i.isButton()) {
                        await this.handleButtonInteraction(i, type, isGlobal, guildId, interaction.user.id);
                    } else if (i.isStringSelectMenu()) {
                        await this.handleSelectMenuInteraction(i, isGlobal, guildId, interaction.user.id);
                    }
                } catch (error) {
                    console.error('Error handling leaderboard interaction:', error);
                    if (error.code === 10062) {
                        console.log('Leaderboard interaction expired, ignoring...');
                    } else {
                        try {
                            await i.reply({
                                content: 'An error occurred while updating the leaderboard.',
                                ephemeral: true
                            });
                        } catch (replyError) {
                            console.error('Failed to send error message:', replyError);
                        }
                    }
                }
            });

            collector.on('end', () => {
                try {
                    interaction.editReply({ components: [] }).catch(() => null);
                } catch (error) {
                    console.error('Error removing components:', error);
                }
            });

        } catch (error) {
            console.error('Error in economy leaderboard command:', error);
            
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err as ColorResolvable)
                .setTitle('❌ Error')
                .setDescription('An error occurred while fetching the leaderboard.')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    }

    private async getLeaderboard(
        type: 'total' | 'wallet' | 'bank' | 'level', 
        isGlobal: boolean, 
        guildId: string | null
    ) {
        try {
            const pipeline: PipelineStage[] = [];

            // First, make sure we only get users that have economy data
            pipeline.push({
                $match: {
                    'economy': { $exists: true }
                }
            });

            // Add guild filter if not global (make it more flexible)
            if (!isGlobal && guildId) {
                pipeline.push({
                    $match: {
                        $or: [
                            { 'joinedServers': guildId },
                            { 'joinedServers': { $in: [guildId] } }, // Handle array format
                            { 'joinedServers': { $exists: false } }  // Include users without joinedServers (legacy)
                        ]
                    }
                });
            }

            // Use a more lenient filter for users with meaningful economy data
            pipeline.push({
                $match: {
                    $or: [
                        { 'economy.wallet': { $gte: 0 } },
                        { 'economy.bank': { $gte: 0 } },
                        { 'economy.level': { $gte: 1 } },
                        { 'economy.experience': { $gte: 0 } }
                    ]
                }
            });

            // Add fields and sorting based on type
            if (type === 'total') {
                pipeline.push(
                    {
                        $addFields: {
                            totalMoney: { 
                                $add: [
                                    { $ifNull: ['$economy.wallet', 0] },
                                    { $ifNull: ['$economy.bank', 0] }
                                ]
                            }
                        }
                    },
                    { $sort: { totalMoney: -1 } }
                );
            } else if (type === 'wallet') {
                pipeline.push({ $sort: { 'economy.wallet': -1 } });
            } else if (type === 'bank') {
                pipeline.push({ $sort: { 'economy.bank': -1 } });
            } else if (type === 'level') {
                pipeline.push({ 
                    $sort: { 
                        'economy.level': -1, 
                        'economy.experience': -1 
                    } 
                });
            }

            // Get more users to find user position
            pipeline.push({ $limit: 1000 });
            
            const users = await User.aggregate(pipeline);
            
            return users as LeaderboardUser[];
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            return [];
        }
    }

    private formatUserStats(currentUser: IUser, type: 'total' | 'wallet' | 'bank' | 'level'): string {
        const typeEmojis = {
            total: '💰',
            wallet: '💵',
            bank: '🏦', 
            level: '⭐'
        };

        if (type === 'total') {
            const total = (currentUser.economy?.wallet || 0) + (currentUser.economy?.bank || 0);
            return `💰 **${total.toLocaleString()}** coins total\n💵 ${(currentUser.economy?.wallet || 0).toLocaleString()} in wallet\n🏦 ${(currentUser.economy?.bank || 0).toLocaleString()} in bank`;
        } else if (type === 'level') {
            return `⭐ **Level ${currentUser.economy?.level || 1}**\n📈 ${(currentUser.economy?.experience || 0).toLocaleString()} experience points`;
        } else {
            const amount = currentUser.economy?.[type] || 0;
            return `${typeEmojis[type]} **${amount.toLocaleString()}** coins`;
        }
    }

    private findUserPosition(leaderboardData: LeaderboardUser[], userId: string, type: 'total' | 'wallet' | 'bank' | 'level'): number {
        const userIndex = leaderboardData.findIndex(user => user.userId === userId);
        return userIndex === -1 ? -1 : userIndex + 1;
    }

    private async createLeaderboardEmbed(
        users: LeaderboardUser[], 
        type: 'total' | 'wallet' | 'bank' | 'level',
        isGlobal: boolean,
        currentUser: IUser | null,
        userPosition: number,
        serverName: string
    ): Promise<EmbedBuilder> {
        const typeNames = {
            total: 'Total Wealth',
            wallet: 'Wallet Balance', 
            bank: 'Bank Balance',
            level: 'Level & Experience'
        };

        const typeEmojis = {
            total: '💰',
            wallet: '💵',
            bank: '🏦', 
            level: '⭐'
        };

        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default as ColorResolvable)
            .setTitle(`${typeEmojis[type]} ${typeNames[type]} Leaderboard`)
            .setDescription(`${isGlobal ? '🌍 Global' : '🏠 ' + serverName} • Top ${users.length} Users`)
            .setTimestamp();

        // Create leaderboard text
        let leaderboardText = '';
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const position = i + 1;
            
            // Get medal emoji for top 3
            const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `**${position}.**`;
            
            let value = '';
            if (type === 'total') {
                const total = (user.economy?.wallet || 0) + (user.economy?.bank || 0);
                value = `${total.toLocaleString()} coins`;
            } else if (type === 'level') {
                value = `Level ${user.economy?.level || 1} (${(user.economy?.experience || 0).toLocaleString()} XP)`;
            } else {
                const amount = user.economy?.[type] || 0;
                value = `${amount.toLocaleString()} coins`;
            }

            // Highlight current user
            const isCurrentUser = user.userId === currentUser.userId;
            const userLine = `${medal} ${isCurrentUser ? '**' : ''}<@${user.userId}>${isCurrentUser ? '**' : ''} • ${value}${isCurrentUser ? ' ⬅️' : ''}`;
            
            leaderboardText += userLine + '\n';
        }

        embed.addFields({
            name: 'Rankings',
            value: leaderboardText || 'No users found',
            inline: false
        });

        // Add user's current stats
        const userStats = this.formatUserStats(currentUser, type);

        embed.addFields({
            name: `Your ${typeNames[type]}`,
            value: userStats + (userPosition > 0 ? `\n📊 **Rank #${userPosition}**` : '\n📊 **Not ranked**'),
            inline: true
        });

        return embed;
    }

    private createComponents(currentType: string, isGlobal: boolean): ActionRowBuilder<any>[] {
        // Type selector dropdown
        const typeSelect = new StringSelectMenuBuilder()
            .setCustomId('leaderboard_type')
            .setPlaceholder('Select leaderboard type')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Total Wealth')
                    .setDescription('Wallet + Bank combined')
                    .setValue('total')
                    .setEmoji('💰')
                    .setDefault(currentType === 'total'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Wallet Balance')
                    .setDescription('Money in wallet only')
                    .setValue('wallet')
                    .setEmoji('💵')
                    .setDefault(currentType === 'wallet'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Bank Balance')
                    .setDescription('Money in bank only')
                    .setValue('bank')
                    .setEmoji('🏦')
                    .setDefault(currentType === 'bank'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Level & Experience')
                    .setDescription('User levels and XP')
                    .setValue('level')
                    .setEmoji('⭐')
                    .setDefault(currentType === 'level')
            );

        // Scope toggle button
        const scopeButton = new ButtonBuilder()
            .setCustomId('leaderboard_scope')
            .setLabel(isGlobal ? 'Show Server Only' : 'Show Global')
            .setEmoji(isGlobal ? '🏠' : '🌍')
            .setStyle(ButtonStyle.Secondary);

        // Refresh button
        const refreshButton = new ButtonBuilder()
            .setCustomId('leaderboard_refresh')
            .setLabel('Refresh')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Primary);

        return [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(typeSelect),
            new ActionRowBuilder<ButtonBuilder>().addComponents(scopeButton, refreshButton)
        ];
    }

    private async handleButtonInteraction(
        interaction: ButtonInteraction, 
        currentType: string,
        isGlobal: boolean,
        guildId: string | null,
        userId: string
    ) {
        await interaction.deferUpdate();

        try {
            let newIsGlobal = isGlobal;

            if (interaction.customId === 'leaderboard_scope') {
                newIsGlobal = !isGlobal;
            }

            // Get updated data
            const currentUser = await EconomyService.getUser(userId, interaction.user.username);
            const leaderboardData = await this.getLeaderboard(currentType as any, newIsGlobal, guildId);
            
            if (!leaderboardData || leaderboardData.length === 0) {
                // Handle empty leaderboard case
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.warn as ColorResolvable)
                    .setTitle('📊 Economy Leaderboard')
                    .setDescription('No users found with economy data.')
                    .addFields({
                        name: 'Your Current Stats',
                        value: this.formatUserStats(currentUser, currentType as any),
                        inline: false
                    })
                    .setTimestamp();

                const components = this.createComponents(currentType, newIsGlobal);
                return interaction.editReply({ embeds: [embed], components });
            }
            
            const userPosition = this.findUserPosition(leaderboardData, userId, currentType as any);

            // Create updated embed
            const embed = await this.createLeaderboardEmbed(
                leaderboardData.slice(0, 20),
                currentType as any,
                newIsGlobal,
                currentUser,
                userPosition,
                guildId ? interaction.guild?.name || 'Unknown Server' : 'Global'
            );

            // Update components
            const components = this.createComponents(currentType, newIsGlobal);

            await interaction.editReply({ embeds: [embed], components });
        } catch (error) {
            console.error('Error handling button interaction:', error);
            throw error;
        }
    }

    private async handleSelectMenuInteraction(
        interaction: StringSelectMenuInteraction,
        isGlobal: boolean,
        guildId: string | null,
        userId: string
    ) {
        await interaction.deferUpdate();

        try {
            const newType = interaction.values[0] as 'total' | 'wallet' | 'bank' | 'level';

            // Get updated data
            const currentUser = await EconomyService.getUser(userId, interaction.user.username);
            const leaderboardData = await this.getLeaderboard(newType, isGlobal, guildId);
            
            if (!leaderboardData || leaderboardData.length === 0) {
                // Handle empty leaderboard case
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.warn as ColorResolvable)
                    .setTitle('📊 Economy Leaderboard')
                    .setDescription('No users found with economy data.')
                    .addFields({
                        name: 'Your Current Stats',
                        value: this.formatUserStats(currentUser, newType),
                        inline: false
                    })
                    .setTimestamp();

                const components = this.createComponents(newType, isGlobal);
                return interaction.editReply({ embeds: [embed], components });
            }
            
            const userPosition = this.findUserPosition(leaderboardData, userId, newType);

            // Create updated embed
            const embed = await this.createLeaderboardEmbed(
                leaderboardData.slice(0, 20),
                newType,
                isGlobal,
                currentUser,
                userPosition,
                guildId ? interaction.guild?.name || 'Unknown Server' : 'Global'
            );

            // Update components
            const components = this.createComponents(newType, isGlobal);

            await interaction.editReply({ embeds: [embed], components });
        } catch (error) {
            console.error('Error handling select menu interaction:', error);
            throw error;
        }
    }
}