import {
    ActionRowBuilder,
    ColorResolvable,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextChannel
} from 'discord.js';
import { Command } from '@sapphire/framework';
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
        console.error('Error updating menu message:', error);
        return false;
    }
}
