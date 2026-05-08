import { container } from '@sapphire/framework';
import type {
    ButtonInteraction,
    ChatInputCommandInteraction,
    InteractionEditReplyOptions,
    InteractionReplyOptions,
    MessagePayload
} from 'discord.js';
import { MessageFlags } from 'discord-api-types/v10';

export type RepliableInteraction = ChatInputCommandInteraction | ButtonInteraction;
export type RepliableReplyOptions = string | MessagePayload | InteractionReplyOptions;
export type RepliableEditOptions = string | InteractionEditReplyOptions;

export function getInteractionErrorCode(error: unknown): number | undefined {
    if (typeof error === 'object' && error !== null && 'code' in error) {
        const code = (error as { code?: unknown }).code;
        return typeof code === 'number' ? code : undefined;
    }

    return undefined;
}

export function isExpiredOrAcknowledgedInteractionError(error: unknown): boolean {
    const code = getInteractionErrorCode(error);
    return code === 40060 || code === 10062;
}

function logInteractionHelperError(error: unknown, context: string): void {
    if (isExpiredOrAcknowledgedInteractionError(error)) {
        container.logger.debug(`[interactionHelpers] ${context} failed because the interaction was already acknowledged or expired.`);
        return;
    }

    container.logger.error(`[interactionHelpers] ${context} failed.`, error as Error);
}

function normalizeEditReplyOptions(options: RepliableReplyOptions): InteractionEditReplyOptions | null {
    if (typeof options === 'string') {
        return { content: options };
    }

    if ('content' in options || 'embeds' in options || 'components' in options || 'allowedMentions' in options) {
        const normalized = { ...(options as InteractionReplyOptions) } as Record<string, unknown>;
        delete normalized.flags;
        return normalized as InteractionEditReplyOptions;
    }

    return null;
}

export async function safeReply(interaction: RepliableInteraction, options: RepliableReplyOptions): Promise<void> {
    try {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply(options as InteractionReplyOptions | MessagePayload);
            return;
        }

        if (interaction.deferred) {
            const editOptions = normalizeEditReplyOptions(options);
            if (editOptions) {
                await interaction.editReply(editOptions);
                return;
            }

            if (typeof options === 'string') {
                await interaction.followUp({ content: options, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.followUp(Object.assign({}, options as MessagePayload, { flags: MessageFlags.Ephemeral }));
            }
            return;
        }

        if (typeof options === 'string') {
            await interaction.followUp({ content: options, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.followUp(Object.assign({}, options as MessagePayload, { flags: MessageFlags.Ephemeral }));
        }
    } catch (error) {
        logInteractionHelperError(error, 'safeReply');
    }
}

export async function safeEditReply(interaction: RepliableInteraction, options: RepliableEditOptions): Promise<void> {
    try {
        if (typeof options === 'string') {
            await interaction.editReply({ content: options });
            return;
        }

        await interaction.editReply(options);
    } catch (error) {
        logInteractionHelperError(error, 'safeEditReply');
    }
}

export async function safeDeferUpdate(interaction: ButtonInteraction): Promise<void> {
    if (interaction.replied || interaction.deferred) {
        return;
    }

    try {
        await interaction.deferUpdate();
    } catch (error) {
        logInteractionHelperError(error, 'safeDeferUpdate');
    }
}
