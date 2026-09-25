import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../modules/General'; 
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
	ApplicationCommandType,
	type Message,
	EmbedBuilder,
	ColorResolvable,
	Routes
} from 'discord.js';
import mongoose from 'mongoose';
import config from '../../config';

@ApplyOptions<Command.Options>({
	enabled: true,
	nsfw: false,
	name: 'ping',
	description: 'Bot ping',
	detailedDescription: 'Get the latency of the bot\'s connection to the Discord WebService and database.',
	aliases: ['latency'],
	fullCategory: ['General'],
	cooldownDelay: 5000,
	cooldownLimit: 3,
	cooldownFilteredUsers: (process.env.OWNER_IDS || '').split(',').filter(Boolean),
	flags: true,
})
export class UserCommand extends ModuleCommand<GeneralModule> {
	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, {
			...options,
			module: 'General',
			description: 'ping command',
			enabled: true,
			nsfw: false,
			preconditions: ['ModuleEnabled']
		});
	}

	// Register slash and context menu command
	public override registerApplicationCommands(registry: Command.Registry) {
		// Register slash command
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setIntegrationTypes(0,1)
				.setContexts(0,1,2)
				.addIntegerOption((option) =>
					option
						.setName('shard')
						.setDescription('Specific shard to check latency for')
						.setRequired(false)
						.setMinValue(0)
						.setMaxValue(this.container.client.shard?.count ? this.container.client.shard.count - 1 : 0)
				)
		);

		// Register context menu command available from any message
		registry.registerContextMenuCommand({
			name: this.name,
			type: ApplicationCommandType.Message
		});

		// Register context menu command available from any user
		registry.registerContextMenuCommand({
			name: this.name,
			type: ApplicationCommandType.User
		});
	}

	// Message command
	public override async messageRun(message: Message) {
		// The prefix path has no slash options, so it always reports the shard
		// this connection is on. (It used to reply with the `welcome` reply
		// string here, which made `!ping` answer "Welcome to the party".)
		await message.reply({ content: 'Measuring latency...' });
		return message.edit({ embeds: [this.pingEmbed(await this.measure())] });
	}

	private async measure() {
		// A real REST round-trip is the only honest way to read REST latency —
		// timing an `editReply` just measures the deferred-reply flush.
		const apiStart = Date.now();
		await this.container.client.rest.get(Routes.oauth2CurrentAuthorization()).catch(() => null);
		const apiLatency = Date.now() - apiStart;

		const dbStart = Date.now();
		try {
			await mongoose.connection.db?.admin().ping();
		} catch {
			// Database unreachable is reported as ~0ms rather than failing the reply.
		}
		const dbLatency = Date.now() - dbStart;

		let wsLatency = this.container.client.ws.ping;
		const shard = this.container.client.shard;
		const shardId = shard?.ids[0] ?? 0;
		if (shard && shard.count > 1) {
			try {
				const [result] = await shard.broadcastEval(
					(client) => ({ id: client.shard?.ids[0] ?? 0, ping: client.ws.ping }),
					{ context: { shardId } }
				);
				if (result) wsLatency = result.ping;
			} catch {
				// Fall back to this connection's own ping.
			}
		}
		return { apiLatency, dbLatency, wsLatency, shardId, shards: shard?.count ?? 1 };
	}

	private pingEmbed(m: { apiLatency: number; dbLatency: number; wsLatency: number; shardId: number; shards: number }) {
		const embed = new EmbedBuilder()
			.setColor(config.bot.embedColor.default as ColorResolvable)
			.setTitle('🏓 Pong!')
			.setDescription('Latency information')
			.addFields(
				{ name: '⚡ Event Latency', value: `\`[${m.apiLatency}ms]\``, inline: true },
				{ name: '🌐 Discord API Latency', value: `\`[${Math.round(m.wsLatency)}ms]\``, inline: true },
				{ name: '💾 Database Latency', value: `\`[${m.dbLatency}ms]\``, inline: true }
			)
			.setFooter({ text: `Shard: ${m.shardId}${m.shards > 1 ? ` / ${m.shards - 1}` : ''}` })
			.setTimestamp();

		if (m.shards > 1) {
			embed.addFields({
				name: '🔢 Available Shards',
				value: Array.from({ length: m.shards }, (_, i) => `• Shard #${i}`).join('\n'),
				inline: false
			});
		}
		return embed;
	}

	// slash command
	public override async chatInputRun(interaction: ModuleCommand.ChatInputCommandInteraction) {
		await interaction.deferReply();

		const selectedShardId = interaction.options.getInteger('shard');
		const m = await this.measure();
		const embed = this.pingEmbed(m);
		if (selectedShardId !== null) embed.setDescription(`Latency information for Shard #${selectedShardId}`);

		return interaction.editReply({ content: null, embeds: [embed] });
	}

	// context menu command
	public override async contextMenuRun(interaction: ModuleCommand.ContextMenuCommandInteraction) {
		await interaction.deferReply();
		await interaction.editReply({ content: 'Measuring latency...' });
		return interaction.editReply({ content: null, embeds: [this.pingEmbed(await this.measure())] });
	}
}
