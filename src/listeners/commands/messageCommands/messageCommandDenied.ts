import type { Events, MessageCommandDeniedPayload } from '@sapphire/framework';
import { Listener, type UserError } from '@sapphire/framework';

const DENIAL_TTL_MS = 5000;

export class UserEvent extends Listener<typeof Events.MessageCommandDenied> {
	public override async run({ context, message: content }: UserError, { message }: MessageCommandDeniedPayload) {
		// `context: { silent: true }` should make UserError silent:
		// Use cases for this are for example permissions error when running the `eval` command.
		if (Reflect.get(Object(context), 'silent')) return;

		// `MessageFlags.Ephemeral` is not accepted on `Message#reply` in
		// discord.js v14, and this path fires for every mod-only / owner-only /
		// disabled-command denial on the prefix path. A public denial leaks that
		// the command exists and that the user is not a moderator, so send it
		// without pings and clean it up.
		const reply = await message.reply({ content, allowedMentions: { parse: [] } });
		setTimeout(() => void reply.delete().catch(() => null), DENIAL_TTL_MS).unref?.();
	}
}
