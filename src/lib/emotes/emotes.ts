/**
 * Shared emote definitions for the `Emotion` commands and the unified `/emote`.
 */
import { EmbedBuilder, type ColorResolvable, type Message, type User } from 'discord.js';
import config from '../../config';

export interface EmoteDefinition {
	/** Choice value + bare prefix name (`xwave`, `/emote wave`). */
	name: string;
	/** Short human description used in help + the slash choice label. */
	description: string;
	emoji: string;
	/** Line used when someone is targeted. `{author}` / `{target}` are replaced. */
	target: string;
	/** Line used when nobody is mentioned. */
	solo: string;
}

export const EMOTES: EmoteDefinition[] = [
	{
		name: 'bite',
		description: 'Bite someone (gently… probably)',
		emoji: '🦷',
		target: '{author} bites {target}!',
		solo: '{author} bites their own lip!'
	},
	{
		name: 'blush',
		description: 'Blush at someone',
		emoji: '😊',
		target: '{author} blushes at {target}!',
		solo: '{author} blushes softly!'
	},
	{
		name: 'cuddle',
		description: 'Cuddle someone',
		emoji: '🤗',
		target: '{author} cuddles {target}!',
		solo: '{author} cuddles a pillow!'
	},
	{
		name: 'dance',
		description: 'Dance with someone',
		emoji: '💃',
		target: '{author} dances with {target}!',
		solo: '{author} dances alone!'
	},
	{
		name: 'facepalm',
		description: 'Facepalm at someone',
		emoji: '🤦',
		target: '{author} facepalms at {target}!',
		solo: '{author} facepalms!'
	},
	{
		name: 'handhold',
		description: 'Hold hands with someone',
		emoji: '🤝',
		target: '{author} holds hands with {target}!',
		solo: '{author} holds their own hands!'
	},
	{
		name: 'hug',
		description: 'Hug someone',
		emoji: '🤗',
		target: '{author} hugs {target}!',
		solo: '{author} hugs themselves!'
	},
	{
		name: 'kiss',
		description: 'Kiss someone',
		emoji: '💋',
		target: '{author} kisses {target}!',
		solo: '{author} blows a kiss!'
	},
	{
		name: 'lick',
		description: 'Lick someone',
		emoji: '👅',
		target: '{author} licks {target}!',
		solo: '{author} licks their lips!'
	},
	{
		name: 'nuzzle',
		description: 'Nuzzle someone',
		emoji: '🐱',
		target: '{author} nuzzles {target}!',
		solo: '{author} nuzzles up!'
	},
	{
		name: 'pat',
		description: 'Pat someone',
		emoji: '🤚',
		target: '{author} pats {target}!',
		solo: '{author} pats themselves!'
	},
	{
		name: 'poke',
		description: 'Poke someone',
		emoji: '👉',
		target: '{author} pokes {target}!',
		solo: '{author} pokes around!'
	},
	{
		name: 'punch',
		description: 'Punch someone',
		emoji: '👊',
		target: '{author} punches {target}!',
		solo: '{author} shadowboxes!'
	},
	{
		name: 'shrug',
		description: 'Shrug at someone',
		emoji: '🤷',
		target: '{author} shrugs at {target}!',
		solo: '{author} shrugs!'
	},
	{
		name: 'slap',
		description: 'Slap someone',
		emoji: '👋',
		target: '{author} slaps {target}!',
		solo: '{author} slaps their own leg!'
	},
	{
		name: 'smile',
		description: 'Smile at someone',
		emoji: '😄',
		target: '{author} smiles at {target}!',
		solo: '{author} smiles warmly!'
	},
	{
		name: 'stare',
		description: 'Stare at someone',
		emoji: '👀',
		target: '{author} stares at {target}!',
		solo: '{author} stares into the void!'
	},
	{
		name: 'think',
		description: 'Think about someone',
		emoji: '💭',
		target: '{author} thinks about {target}!',
		solo: '{author} is deep in thought!'
	},
	{
		name: 'tickle',
		description: 'Tickle someone',
		emoji: '🤣',
		target: '{author} tickles {target}!',
		solo: '{author} is ticklish!'
	},
	{
		name: 'wave',
		description: 'Wave at someone',
		emoji: '👋',
		target: '{author} waves at {target}!',
		solo: '{author} waves hello!'
	}
];

export function findEmote(input: string): EmoteDefinition | null {
	const needle = input.toLowerCase();
	return EMOTES.find((emote) => emote.name === needle) ?? null;
}

/** Renders `{author}` / `{target}` into `**bold**` Discord mentions. */
export function renderEmoteText(definition: EmoteDefinition, author: User, target: User | null): string {
	const line = target ? definition.target : definition.solo;
	return line.replaceAll('{author}', `**${author}**`).replaceAll('{target}', `**${target ?? ''}**`);
}

export function buildEmoteEmbed(definition: EmoteDefinition, author: User, target: User | null): EmbedBuilder {
	return new EmbedBuilder()
		.setColor(config.bot.embedColor.default as ColorResolvable)
		.setTitle(`${definition.emoji} ${definition.description}`)
		.setDescription(renderEmoteText(definition, author, target))
		.setThumbnail(author.displayAvatarURL())
		.setTimestamp();
}

/**
 * Shared `messageRun` body for the bare prefix names (`xwave`, `xhug`, …).
 * The user is optional: with no mention the command performs the solo
 * variant instead of erroring.
 */
export function replyWithEmote(definition: EmoteDefinition, message: Message): Promise<Message> {
	const target = message.mentions.users.first() ?? null;
	const embed = buildEmoteEmbed(definition, message.author, target);
	return message.reply({ embeds: [embed] });
}
