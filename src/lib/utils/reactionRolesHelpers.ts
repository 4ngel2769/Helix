import {
    ActionRowBuilder,
    ColorResolvable,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextChannel
} from 'discord.js';
import { Command, container } from '@sapphire/framework';
import type { ReactionRole } from '../../models/Guild';
import config from '../../config';

interface UpdateReactionRoleMenuMessageParams {
    interaction: Command.ChatInputCommandInteraction;
    channelId: string;
    messageId: string;
    title: string;
    description: string;
    roles: ReactionRole[];
    maxSelections: number;
    isActive: boolean;
}

export interface PostReactionRoleMenuParams {
    guildId: string;
    channelId: string;
    title: string;
    description: string;
    roles: ReactionRole[];
    maxSelections: number;
    active: boolean;
}

/**
 * Post a fresh reaction-role menu message to a channel (used by the dashboard
 * "let the bot post it" flow). Returns the sent message id.
 */
export async function postReactionRoleMenuMessage({
    guildId,
    channelId,
    title,
    description,
    roles,
    maxSelections,
    active
}: PostReactionRoleMenuParams): Promise<string> {
    const guild = container.client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Bot is not in this guild');
    const channel = (await guild.channels.fetch(channelId).catch(() => null)) as TextChannel | null;
    if (!channel || !channel.isTextBased()) throw new Error('Channel not found or not a text channel');

    const me = guild.members.me;
    if (!me?.permissions.has('SendMessages') || !channel.permissionsFor(me)?.has(['SendMessages', 'EmbedLinks'])) {
        throw new Error('I need Send Messages + Embed Links in the target channel');
    }

    const embed = new EmbedBuilder()
        .setColor(config.bot.embedColor.default as ColorResolvable)
        .setTitle(title)
        .setDescription(description || 'Select your roles below')
        .setFooter({
            text: active ? 'Select roles from the dropdown menu below' : 'This role selection menu is currently paused'
        });

    const options = roles.map((role) => {
        const option = new StringSelectMenuOptionBuilder()
            .setLabel(role.label)
            .setValue(role.roleId)
            .setDescription(`Get the ${guild.roles.cache.get(role.roleId)?.name || 'Unknown'} role`);
        if (role.emoji) applyEmojiToOption(option, role.emoji);
        return option;
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('reaction-roles-select')
        .setPlaceholder(active ? 'Select roles...' : 'Menu is currently paused')
        .addOptions(options)
        .setDisabled(!active)
        .setMinValues(0)
        .setMaxValues(maxSelections > 0 ? Math.min(maxSelections, roles.length) : roles.length);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    const sent = await (channel as TextChannel).send({ embeds: [embed], components: [row] });
    return sent.id;
}

export function parseReactionRoleEmoji(emojiInput: string | null): string | undefined {
    if (!emojiInput) return undefined;

    const discordEmojiRegex = /<(a)?:(\w+):(\d+)>/;
    const match = emojiInput.match(discordEmojiRegex);

    if (match) {
        return emojiInput;
    }

    return emojiInput;
}

function applyEmojiToOption(option: StringSelectMenuOptionBuilder, emoji: string): void {
    const discordEmojiRegex = /<(a)?:(\w+):(\d+)>/;
    const match = emoji.match(discordEmojiRegex);

    if (match) {
        const name = match[2];
        const id = match[3];
        option.setEmoji({ name, id });
        return;
    }

    option.setEmoji({ name: emoji });
}

export async function updateReactionRoleMenuMessage({
    interaction,
    channelId,
    messageId,
    title,
    description,
    roles,
    maxSelections,
    isActive
}: UpdateReactionRoleMenuMessageParams): Promise<boolean> {
    try {
        const channel = (await interaction.guild?.channels.fetch(channelId)) as TextChannel;
        if (!channel) {
            return false;
        }

        const message = await channel.messages.fetch(messageId);
        if (!message) {
            return false;
        }

        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default as ColorResolvable)
            .setTitle(title)
            .setDescription(description)
            .setFooter({
                text: isActive
                    ? 'Select roles from the dropdown menu below'
                    : 'This role selection menu is currently paused'
            });

        const options = roles.map((role) => {
            const option = new StringSelectMenuOptionBuilder()
                .setLabel(role.label)
                .setValue(role.roleId)
                .setDescription(`Get the ${interaction.guild?.roles.cache.get(role.roleId)?.name || 'Unknown'} role`);

            if (role.emoji) {
                applyEmojiToOption(option, role.emoji);
            }

            return option;
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('reaction-roles-select')
            .setPlaceholder(isActive ? 'Select roles...' : 'Menu is currently paused')
            .addOptions(options)
            .setDisabled(!isActive)
            .setMinValues(0)
            .setMaxValues(maxSelections > 0 ? Math.min(maxSelections, roles.length) : roles.length);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        await message.edit({
            embeds: [embed],
            components: [row]
        });

        return true;
    } catch (error) {
        container.logger.error('Error updating menu message:', error);
        return false;
    }
}
