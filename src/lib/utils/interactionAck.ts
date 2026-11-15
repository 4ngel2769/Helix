import { container } from '@sapphire/framework';
import { MessageFlags, type ContextMenuCommandInteraction, type RepliableInteraction } from 'discord.js';

/**
 * Discord gives an interaction three seconds to be acknowledged. Anything slower
 * is shown to the user as "The application did not respond" and the interaction
 * token is gone — even when the command eventually succeeds. A stalled database
 * or one slow `await` is enough to cross that line.
 *
 * This guard is armed before a command/handler starts. If the interaction is
 * still unacknowledged when the deadline passes, it is deferred and its reply
 * methods are rewired onto `editReply`, so the existing command code keeps
 * working unchanged and the user gets a real answer instead of a timeout.
 */
export const ACK_DEADLINE_MS = 2_200;

type MutableInteraction = Record<string, unknown>;
/** `RepliableInteraction` excludes the abstract context-menu base type. */
type AckableInteraction = RepliableInteraction | ContextMenuCommandInteraction;

const timers = new WeakMap<object, NodeJS.Timeout>();

/**
 * A first reply may carry `flags`/`ephemeral`; an edit may not. Strip them so a
 * command that replies ephemerally still works after the guard deferred.
 */
function toEditPayload(options: unknown): Record<string, unknown> | string {
	if (typeof options === 'string') return options;
	if (!options || typeof options !== 'object') return { content: '\u200b' };
	const payload = { ...(options as Record<string, unknown>) };
	delete payload.flags;
	delete payload.ephemeral;
	return Object.keys(payload).length > 0 ? payload : { content: '\u200b' };
}

function patchMethod(target: MutableInteraction, name: string, replacement: (...args: unknown[]) => unknown): void {
	// `update`/`deferUpdate` only exist on component interactions.
	if (typeof target[name] !== 'function') return;
	target[name] = replacement;
}

/**
 * Rewire the interaction so later `reply`/`update` calls become edits.
 *
 * The rewiring happens *before* the deferral round trip finishes, so a command
 * that answers in that window cannot hit `InteractionAlreadyReplied` — every
 * patched call is chained onto the in-flight defer instead.
 */
function rewireAfterDefer(interaction: AckableInteraction, deferring: Promise<unknown>): void {
	const target = interaction as unknown as MutableInteraction;
	const editReply = (options: unknown) =>
		deferring.then(
			() => interaction.editReply(toEditPayload(options) as never),
			// The defer itself failed (expired token / already acknowledged). The
			// interaction was never acknowledged, so a plain reply is still valid.
			() => interaction.reply(options as never)
		);
	const noop = () => deferring.catch(() => undefined).then(() => undefined);

	patchMethod(target, 'reply', editReply);
	patchMethod(target, 'update', editReply);
	patchMethod(target, 'deferReply', noop);
	patchMethod(target, 'deferUpdate', noop);
}

/** Arm the ack deadline for an interaction. Safe to call more than once. */
export function armInteractionAck(interaction: AckableInteraction, label: string): void {
	clearInteractionAck(interaction);

	const timer = setTimeout(() => {
		timers.delete(interaction);
		// A fast command already answered — nothing to rescue.
		if (interaction.deferred || interaction.replied) return;

		const deferring = interaction.deferReply({ flags: MessageFlags.Ephemeral });
		rewireAfterDefer(interaction, deferring);

		void deferring.then(
			() => container.logger.warn(`[ack-guard] ${label} did not acknowledge within ${ACK_DEADLINE_MS}ms; deferred it`),
			(error: unknown) => container.logger.warn(`[ack-guard] could not defer ${label}:`, error)
		);
	}, ACK_DEADLINE_MS);

	// Never keep the process alive just for an ack guard.
	timer.unref?.();
	timers.set(interaction, timer);
}

/** Cancel a pending guard (the interaction was handled or failed fast). */
export function clearInteractionAck(interaction: object): void {
	const timer = timers.get(interaction);
	if (!timer) return;
	clearTimeout(timer);
	timers.delete(interaction);
}
