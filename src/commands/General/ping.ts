import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../modules/General'; 
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';
import { ApplicationCommandType, type Message } from 'discord.js';
import { env } from 'process';
import { getDefReply } from '../../lib/utils';

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
	cooldownFilteredUsers: [env.OWNERS],
	flags: true
})
export class UserCommand extends ModuleCommand<GeneralModule> {

	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, {
			...options,
			module: 'GeneralModule',
			description: 'ping command',
			enabled: true,
			nsfw: false,
			preconditions: ['Enabled'],
			// preconditions: ['ModuleEnabled']
		})
	}
	// Register slash and context menu command
	public override registerApplicationCommands(registry: Command.Registry) {
		// Register slash command
		registry.registerChatInputCommand({
			name: this.name,
			description: this.description
		});

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
		// const msg = await send(message, 'Ping?');

		// const content = `Pong! Bot Latency ${Math.round(this.container.client.ws.ping)}ms. API Latency ${
		// 	(msg.editedTimestamp || msg.createdTimestamp) - (message.editedTimestamp || message.createdTimestamp)
		// }ms.`;

		// return send(message, content);
		if (message.guild) {
			let defReply = await getDefReply('welcome');
			return send(message, `${defReply}`);
		} else {
			return send(message, `DM command`);
		}
	}

	// slash command
	public override async chatInputRun(interaction: ModuleCommand.ChatInputCommandInteraction) {
		const msg = await interaction.reply({ content: 'Ping?', ephemeral: true, fetchReply: true });

		const content = `Pong! Bot Latency ${Math.round(this.container.client.ws.ping)}ms. API Latency ${
			msg.createdTimestamp - interaction.createdTimestamp
		}ms.
		`;

		return interaction.editReply({ content });
	}

	// context menu command
	public override async contextMenuRun(interaction: ModuleCommand.ContextMenuCommandInteraction) {
		const msg = await interaction.reply({ content: 'Ping?', fetchReply: true });

		const content = `Pong! Bot Latency ${Math.round(this.container.client.ws.ping)}ms. API Latency ${
			msg.createdTimestamp - interaction.createdTimestamp
		}ms.`;

		return interaction.editReply({ content });
	}
}
