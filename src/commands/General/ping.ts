import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../modules/General'; 
import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';
import {
	ApplicationCommandType,
	type Message,
	// MessageFlags,
	EmbedBuilder,
	ColorResolvable
} from 'discord.js';
import { env } from 'process';
import { getDefReply } from '../../lib/utils';
import mongoose from 'mongoose';
import config from '../../config';

@ApplyOptions<Command.Options>({
	nsfw: false,
	description: 'Bot ping',
	detailedDescription: 'Get the latency of the bot\'s connection to the Discord WebService and database.',
	// aliases: ['latency'],
	fullCategory: ['General'],
	cooldownDelay: 5000,
	cooldownLimit: 3,
	cooldownFilteredUsers: [env.OWNERS],
	flags: true,
})
export class UserCommand extends ModuleCommand<GeneralModule> {
	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, {
			...options,
			description: 'ping command',
			nsfw: false,
		});
	}

	// Register slash and context menu command
	public override registerApplicationCommands(registry: Command.Registry) {
		// Register slash command
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('ping')
				.setDescription('Bot ping')
				.setIntegrationTypes(0,1)
				.setContexts(0,1,2)
				.addIntegerOption((option) =>
					option
						.setName('shard')
						.setDescription('Specific shard to check latency for')
						.setRequired(false)
						.setMinValue(0)
						.setMaxValue(container.client.shard?.count ? container.client.shard.count - 1 : 0)
				)
		);

		// Register context menu command available from any message
		registry.registerContextMenuCommand({
			name: 'ping',
			type: ApplicationCommandType.Message
		});

		// Register context menu command available from any user
		registry.registerContextMenuCommand({
			name: 'ping',
			type: ApplicationCommandType.User
		});
	}

	// Message command
	public override async messageRun(message: Message) {
		// Send initial measuring message and measure event/API latency
		const apiStart = Date.now();
		const replyMessage = (await send(message, 'Measuring latency...')) as Message;
		const apiLatency = Date.now() - apiStart;

		// Measure database latency
		const dbStart = Date.now();
		try {
			await mongoose.connection.db?.admin().ping();
		} catch {
			// ignore DB errors for the purpose of latency reporting
		}
		const dbLatency = Date.now() - dbStart;

		// Determine current shard id
		const currentShardId = container.client.shard?.ids[0] ?? 0;

		// Get websocket latency (try to get from shards if shard manager present)
		let wsLatency = 0;
		if (container.client.shard) {
			try {
				const shardPingResults = await container.client.shard.broadcastEval((client) => {
					return {
						id: client.shard?.ids[0] ?? 0,
						ping: client.ws.ping
					};
				});
				if (Array.isArray(shardPingResults) && shardPingResults.length > 0) {
					// prefer the result from the current shard if available
					const found = shardPingResults.find(r => r && typeof r.id !== 'undefined' && r.id === currentShardId);
					wsLatency = (found ?? shardPingResults[0]).ping;
				} else {
					wsLatency = container.client.ws.ping;
				}
			} catch {
				wsLatency = container.client.ws.ping;
			}
		} else {
			wsLatency = container.client.ws.ping;
		}

		// Build embed
		const embed = new EmbedBuilder()
			.setColor(config.bot.embedColor.default as ColorResolvable)
			.setTitle('🏓 Pong!')
			.setDescription('Latency information')
			.addFields(
				{ name: '⚡ Event Latency', value: `\`[${apiLatency}ms]\``, inline: true },
				{ name: '🌐 Discord API Latency', value: `\`[${Math.round(wsLatency)}ms]\``, inline: true },
				{ name: '💾 Database Latency', value: `\`[${dbLatency}ms]\``, inline: true }
			)
			.setFooter({ text: `Shard: ${currentShardId}${container.client.shard ? ` / ${container.client.shard.count}` : ''}` })
			.setTimestamp();

		// If using multiple shards, list them
		if (container.client.shard && container.client.shard.count > 1) {
			let shardInfo = '';
			for (let i = 0; i < container.client.shard.count; i++) {
				shardInfo += `• Shard #${i}${i === currentShardId ? ' (current)' : ''}\n`;
			}
			embed.addFields({
				name: '🔢 Available Shards',
				value: shardInfo,
				inline: false
			});
		}

		// Edit the initial reply with the embed
		try {
			return await replyMessage.edit({ content: null, embeds: [embed] });
		} catch {
			// fallback: send a new message if edit fails
			return send(message, { embeds: [embed] } as any);
		}
	}

	// slash command
	public override async chatInputRun(interaction: ModuleCommand.ChatInputCommandInteraction) {
		await interaction.deferReply({
			// flags: MessageFlags.Ephemeral
		});
		
		// Get selected shard or current shard
		const selectedShardId = interaction.options.getInteger('shard');
		const currentShardId = container.client.shard?.ids[0] ?? 0;
		const shardId = selectedShardId !== null ? selectedShardId : currentShardId;
		
		// Measure Discord API latency
		const apiStartTime = Date.now();
		await interaction.editReply({ content: 'Measuring latency...' });
		const apiLatency = Date.now() - apiStartTime;
		
		// Measure database latency
		const dbStartTime = Date.now();
		try {
			await mongoose.connection.db?.admin().ping();
		} catch (error) {
			// If database ping fails, continue without it
		}
		const dbLatency = Date.now() - dbStartTime;
		
		// Get WebSocket latency for the selected shard
		let wsLatency = 0;
		if (container.client.shard) {
			// If using shards, get the latency for the selected shard
			try {
				const shardPingResults = await container.client.shard.broadcastEval(
					(client) => {
						return { 
							id: client.shard?.ids[0] ?? 0,
							ping: client.ws.ping
						};
					},
					{ context: { shardId } }
				);
				
				if (shardPingResults && shardPingResults.length > 0) {
					wsLatency = shardPingResults[0].ping;
				}
			} catch (error) {
				// If eval fails, use current client's ping
				wsLatency = container.client.ws.ping;
			}
		} else {
			// If not using shards, just use the current client's ping
			wsLatency = container.client.ws.ping;
		}
		
		// Create embed with all latency information
		const embed = new EmbedBuilder()
			.setColor(config.bot.embedColor.default as ColorResolvable)
			.setTitle('🏓 Pong!')
			.setDescription(`Latency information${selectedShardId !== null ? ` for Shard #${shardId}` : ''}`)
			.addFields(
				{ name: '⚡ Event Latency', value: `\`[${apiLatency}ms]\``, inline: true },
				{ name: '🌐 Discord API Latency', value: `\`[${Math.round(wsLatency)}ms]\``, inline: true },
				{ name: '💾 Database Latency', value: `\`[${dbLatency}ms]\``, inline: true }
			)
			.setFooter({ text: `Shard: ${shardId}${container.client.shard ? ` / ${container.client.shard.count}` : ''}` })
			.setTimestamp();
		
		// If using shards, add information about available shards
		if (container.client.shard && container.client.shard.count > 1) {
			let shardInfo = '';
			for (let i = 0; i < container.client.shard.count; i++) {
				shardInfo += `• Shard #${i}${i === currentShardId ? ' (current)' : ''}\n`;
			}
			
			embed.addFields({
				name: '🔢 Available Shards',
				value: shardInfo,
				inline: false
			});
		}
		
		return interaction.editReply({ content: null, embeds: [embed] });
	}

	// context menu command
	public override async contextMenuRun(interaction: ModuleCommand.ContextMenuCommandInteraction) {
		await interaction.deferReply();
		
		// Measure Discord API latency
		const apiStartTime = Date.now();
		await interaction.editReply({ content: 'Measuring latency...' });
		const apiLatency = Date.now() - apiStartTime;
		
		// Measure database latency
		const dbStartTime = Date.now();
		try {
			await mongoose.connection.db?.admin().ping();
		} catch (error) {
			// If database ping fails, continue without it
		}
		const dbLatency = Date.now() - dbStartTime;
		
		// Get current shard
		const currentShardId = container.client.shard?.ids[0] ?? 0;
		
		// Create embed with all latency information
		const embed = new EmbedBuilder()
			.setColor(config.bot.embedColor.default as ColorResolvable)
			.setTitle('🏓 Pong!')
			.setDescription('Latency information')
			.addFields(
				{ name: '⚡ Event Latency', value: `\`[${apiLatency}ms]\``, inline: true },
				{ name: '🌐 Discord API Latency', value: `\`[${Math.round(container.client.ws.ping)}ms]\``, inline: true },
				{ name: '💾 Database Latency', value: `\`[${dbLatency}ms]\``, inline: true }
			)
			.setFooter({ text: `Shard: ${currentShardId}${container.client.shard ? ` / ${container.client.shard.count}` : ''}` })
			.setTimestamp();
		
		return interaction.editReply({ content: null, embeds: [embed] });
	}
}
