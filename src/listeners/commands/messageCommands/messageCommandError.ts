import { Events, Listener, type MessageCommandErrorPayload } from '@sapphire/framework';

const ERROR_TTL_MS = 8000;

/**
 * Prefix commands have no interaction token, so a throw used to be silent in
 * chat (only logged). Reply briefly and clean up, matching the denial listener.
 */
export class MessageCommandErrorListener extends Listener<typeof Events.MessageCommandError> {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, { ...options, event: Events.MessageCommandError });
	}

	public override async run(error: unknown, payload: MessageCommandErrorPayload) {
		const { message, command } = payload;

		this.container.logger.error(
			`[command-error] ${command.name} failed (guild: ${message.guildId ?? 'DM'}, user: ${message.author.id})`,
			error
		);

		try {
			const reply = await message.reply({
				content: `\`${command.name}\` could not be completed. The error has been logged.`,
				allowedMentions: { parse: [] }
			});
			setTimeout(() => void reply.delete().catch(() => null), ERROR_TTL_MS).unref?.();
		} catch (replyError) {
			this.container.logger.warn(`[command-error] could not reply in ${message.channelId}:`, replyError);
		}
	}
}
