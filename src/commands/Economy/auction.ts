import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { EconomyModule } from '../../modules/Economy';
import { EmbedBuilder, MessageFlags, Message, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import config from '../../config';
import { AuctionService } from '../../lib/services/AuctionService';

@ApplyOptions<Command.Options>({
    name: 'auction',
    description: 'Auction system - create, bid, or view auctions',
    aliases: ['auc']
})
export class AuctionCommand extends ModuleCommand<EconomyModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Economy',
            description: 'Auction system - create, bid, or view auctions',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('auction')
                .setDescription('Auction system - create, bid, or view auctions')
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('create')
                        .setDescription('Create a new auction')
                        .addStringOption((option) =>
                            option
                                .setName('item')
                                .setDescription('Item to auction')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('quantity')
                                .setDescription('Quantity to auction')
                                .setRequired(true)
                                .setMinValue(1)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('starting_bid')
                                .setDescription('Starting bid amount')
                                .setRequired(true)
                                .setMinValue(1)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('duration')
                                .setDescription('Auction duration in hours (default: 24)')
                                .setRequired(false)
                                .setMinValue(1)
                                .setMaxValue(168) // 1 week max
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('bid')
                        .setDescription('Place a bid on an auction')
                        .addStringOption((option) =>
                            option
                                .setName('auction_id')
                                .setDescription('Auction ID to bid on')
                                .setRequired(true)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('amount')
                                .setDescription('Bid amount')
                                .setRequired(true)
                                .setMinValue(1)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('list')
                        .setDescription('View active auctions')
                        .addStringOption((option) =>
                            option
                                .setName('filter')
                                .setDescription('Filter auctions')
                                .setRequired(false)
                                .addChoices(
                                    { name: 'All', value: 'all' },
                                    { name: 'My Auctions', value: 'mine' },
                                    { name: 'My Bids', value: 'bids' },
                                    { name: 'Ending Soon', value: 'ending' }
                                )
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('view')
                        .setDescription('View a specific auction')
                        .addStringOption((option) =>
                            option
                                .setName('auction_id')
                                .setDescription('Auction ID to view')
                                .setRequired(true)
                        )
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                return this.handleCreate(interaction);
            case 'bid':
                return this.handleBid(interaction);
            case 'list':
                return this.handleList(interaction);
            case 'view':
                return this.handleView(interaction);
            default:
                return this.handleList(interaction);
        }
    }

    private async handleCreate(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const itemName = interaction.options.getString('item', true);
        const quantity = interaction.options.getInteger('quantity', true);
        const startingBid = interaction.options.getInteger('starting_bid', true);
        const duration = interaction.options.getInteger('duration') || 24;

        try {
            const result = await AuctionService.createAuction(
                interaction.user.id,
                itemName,
                quantity,
                startingBid,
                duration
            );

            if (!result.success) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err)
                    .setTitle('❌ Auction Creation Failed')
                    .setDescription(result.message)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success)
                .setTitle('🔨 Auction Created!')
                .setDescription(`Your auction has been created successfully!`)
                .addFields(
                    {
                        name: 'Auction ID',
                        value: `\`${result.auction!.id}\``,
                        inline: true
                    },
                    {
                        name: 'Item',
                        value: `${quantity}x ${result.auction!.item.name}`,
                        inline: true
                    },
                    {
                        name: 'Starting Bid',
                        value: `💸 **${startingBid.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: 'Duration',
                        value: `⏰ ${duration} hours`,
                        inline: true
                    },
                    {
                        name: 'Ends At',
                        value: `<t:${Math.floor(result.auction!.endsAt.getTime() / 1000)}:F>`,
                        inline: true
                    }
                )
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error creating auction:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while creating your auction. Please try again.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private async handleBid(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const auctionId = interaction.options.getString('auction_id', true);
        const bidAmount = interaction.options.getInteger('amount', true);

        try {
            const result = await AuctionService.placeBid(interaction.user.id, auctionId, bidAmount);

            if (!result.success) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err)
                    .setTitle('❌ Bid Failed')
                    .setDescription(result.message)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.success)
                .setTitle('🔨 Bid Placed!')
                .setDescription(`Your bid has been placed successfully!`)
                .addFields(
                    {
                        name: 'Auction',
                        value: `${result.auction!.quantity}x ${result.auction!.item.name}`,
                        inline: true
                    },
                    {
                        name: 'Your Bid',
                        value: `💸 **${bidAmount.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: 'Previous Highest',
                        value: `💰 **${result.previousBid!.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: 'Auction Ends',
                        value: `<t:${Math.floor(result.auction!.endsAt.getTime() / 1000)}:R>`,
                        inline: false
                    }
                )
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error placing bid:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while placing your bid. Please try again.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private async handleList(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const filter = interaction.options.getString('filter') || 'all';

        try {
            const result = await AuctionService.getAuctions(interaction.user.id, filter);

            if (!result.success || !result.auctions || result.auctions.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.warn)
                    .setTitle('📋 No Auctions Found')
                    .setDescription('There are no auctions matching your criteria.')
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.default)
                .setTitle('🔨 Active Auctions')
                .setDescription(`Showing ${result.auctions.length} auction(s)`)
                .setTimestamp();

            for (const auction of result.auctions.slice(0, 10)) { // Show max 10 auctions
                const timeLeft = auction.endsAt.getTime() - Date.now();
                const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
                const minutesLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)));

                embed.addFields({
                    name: `${auction.quantity}x ${auction.item.name} (ID: ${auction.id.slice(-8)})`,
                    value: `💰 Current Bid: **${auction.currentBid.toLocaleString()}** coins\n` +
                           `👤 Seller: <@${auction.sellerId}>\n` +
                           `⏰ Time Left: ${hoursLeft}h ${minutesLeft}m`,
                    inline: true
                });
            }

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('auction_refresh')
                        .setLabel('Refresh')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔄'),
                    new ButtonBuilder()
                        .setCustomId('auction_filter_mine')
                        .setLabel('My Auctions')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('👤'),
                    new ButtonBuilder()
                        .setCustomId('auction_filter_ending')
                        .setLabel('Ending Soon')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('⏰')
                );

            return interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Error listing auctions:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while fetching auctions. Please try again.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    private async handleView(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const auctionId = interaction.options.getString('auction_id', true);

        try {
            const result = await AuctionService.getAuction(auctionId);

            if (!result.success || !result.auction) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.err)
                    .setTitle('❌ Auction Not Found')
                    .setDescription('The specified auction could not be found or has expired.')
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const auction = result.auction;
            const timeLeft = auction.endsAt.getTime() - Date.now();
            const isActive = timeLeft > 0;

            const embed = new EmbedBuilder()
                .setColor(isActive ? config.bot.embedColor.default : config.bot.embedColor.warn)
                .setTitle(`🔨 Auction Details`)
                .setDescription(`**${auction.quantity}x ${auction.item.name}**`)
                .addFields(
                    {
                        name: 'Auction ID',
                        value: `\`${auction.id}\``,
                        inline: true
                    },
                    {
                        name: 'Seller',
                        value: `<@${auction.sellerId}>`,
                        inline: true
                    },
                    {
                        name: 'Status',
                        value: isActive ? '🟢 Active' : '🔴 Ended',
                        inline: true
                    },
                    {
                        name: 'Starting Bid',
                        value: `💸 **${auction.startingBid.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: 'Current Bid',
                        value: `💰 **${auction.currentBid.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: 'Highest Bidder',
                        value: auction.highestBidderId ? `<@${auction.highestBidderId}>` : 'None',
                        inline: true
                    },
                    {
                        name: 'Created',
                        value: `<t:${Math.floor(auction.createdAt.getTime() / 1000)}:F>`,
                        inline: true
                    },
                    {
                        name: isActive ? 'Ends' : 'Ended',
                        value: `<t:${Math.floor(auction.endsAt.getTime() / 1000)}:F>`,
                        inline: true
                    }
                )
                .setTimestamp();

            if (auction.bids && auction.bids.length > 0) {
                const recentBids = auction.bids
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 5)
                    .map((bid, index) => `${index + 1}. <@${bid.bidderId}> - **${bid.amount.toLocaleString()}** coins`)
                    .join('\n');

                embed.addFields({
                    name: 'Recent Bids',
                    value: recentBids,
                    inline: false
                });
            }

            const row = new ActionRowBuilder<ButtonBuilder>();

            if (isActive && auction.sellerId !== interaction.user.id) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`auction_bid_${auction.id}`)
                        .setLabel('Place Bid')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('💰')
                );
            }

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('auction_refresh_view')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄')
            );

            return interaction.editReply({ 
                embeds: [embed], 
                components: row.components.length > 0 ? [row] : [] 
            });

        } catch (error) {
            console.error('Error viewing auction:', error);

            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor.err)
                .setTitle('❌ Error')
                .setDescription('An error occurred while fetching auction details. Please try again.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }

    public override async messageRun(message: Message) {
        const args = message.content.split(' ').slice(1);
        
        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default)
            .setTitle('🔨 Auction System')
            .setDescription('Use slash commands for the auction system:')
            .addFields(
                {
                    name: 'Commands',
                    value: '`/auction create` - Create a new auction\n' +
                           '`/auction bid` - Place a bid\n' +
                           '`/auction list` - View active auctions\n' +
                           '`/auction view` - View specific auction',
                    inline: false
                }
            )
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
}
