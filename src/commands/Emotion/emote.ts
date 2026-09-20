/**
 * Unified emote command.
 *
 * Slash: `/emote <emote> [user]`
 * Prefix: `xemote wave @user` or `xemote wave` (solo variant). The bare
 * names (`xhug`, `xwave`, …) still work as their own text commands.
 */
import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags, type Message, type User } from 'discord.js';
import config from '../../config';
import { EMOTES, buildEmoteEmbed, findEmote } from '../../lib/emotes/emotes';

@ApplyOptions<Command.Options>({
	name: 'emote',
	description: 'Perform an emote, optionally at someone',
	aliases: ['emotes'],
	fullCategory: ['Fun'],
	enabled: true
})
export class EmoteCommand extends ModuleCommand<FunModule> {
	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, { ...options, module: 'Fun', description: 'Perform an emote, optionally at someone', enabled: true });
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('emote')
				.setDescription('Perform an emote, optionally at someone')
				.setContexts(0, 1, 2)
				.setIntegrationTypes(0, 1)
				.addStringOption((option) =>
					option
						.setName('emote')
						.setDescription('Which emote to perform')
						.setRequired(true)
						.addChoices(...EMOTES.map((emote) => ({ name: emote.description, value: emote.name })))
				)
				.addUserOption((option) => option.setName('user').setDescription('Who to perform the emote at').setRequired(false))
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const name = interaction.options.getString('emote', true);
		const target = interaction.options.getUser('user');
		const definition = findEmote(name);

		if (!definition) {
			return interaction.reply({ content: `Unknown emote \`${name}\`. Pick one with \`/emote\`.`, flags: MessageFlags.Ephemeral });
		}

		const embed = buildEmoteEmbed(definition, interaction.user, target);
		return interaction.reply({ embeds: [embed] });
	}

	public override async messageRun(message: Message) {
		const args = message.content.split(/\s+/).slice(1);

		if (args.length === 0) {
			const list = EMOTES.map((emote) => `\`${emote.name}\``).join(' ');
			const embed = new EmbedBuilder()
				.setColor(config.bot.embedColor.default)
				.setTitle('🎭 Emotes')
				.setDescription(`Usage: \`xemote <emote> [@user]\`\n\nAvailable emotes:\n${list}`)
				.setTimestamp();
			return message.reply({ embeds: [embed] });
		}

		const definition = findEmote(args[0]);
		if (!definition) {
			return message.reply(`Unknown emote \`${args[0]}\`. Run \`xemote\` to see them all.`);
		}

		const target = await this.resolveTarget(message, args.slice(1));
		const embed = buildEmoteEmbed(definition, message.author, target);
		return message.reply({ embeds: [embed] });
	}

	private async resolveTarget(message: Message, args: string[]): Promise<User | null> {
		if (args.length === 0) return null;
		const mention = message.mentions.users.first();
		if (mention) return mention;
		const id = args[0].replace(/[<@!>]/g, '');
		if (/^\d{17,20}$/.test(id)) return (await message.client.users.fetch(id).catch(() => null)) ?? null;
		return null;
	}
}
