/**
 * Text → slash bridge.
 *
 * Most Helix commands only implement `chatInputRun`, which made them unusable
 * with the message prefix. This module fakes the slice of
 * `ChatInputCommandInteraction` that these commands actually touch, so a
 * command can support text by forwarding to the very same `chatInputRun`
 * (see `lib/structures/HybridCommand`).
 *
 * Option metadata is read from the command's own registered builders, so text
 * usage automatically follows the slash definition (no duplicated specs).
 */
import { container, type Command } from '@sapphire/framework';
import { ApplicationCommandOptionType, MessageFlags, type GuildMember, type Message, type User } from 'discord.js';
import config from '../../config';
import { getGuildPrefixFromCache } from './prefixCache';

/** Subset of the (snake_case) application command option JSON we care about. */
export interface TextOptionData {
	name: string;
	description?: string;
	type: number;
	required?: boolean;
	options?: TextOptionData[];
	choices?: Array<{ name: string; value: string | number }>;
	autocomplete?: boolean;
}

export interface TextParseSuccess {
	ok: true;
	subcommand: string | null;
	subcommandGroup: string | null;
	values: Map<string, unknown>;
}

export interface TextParseFailure {
	ok: false;
	error: string;
}

export type TextParseResult = TextParseSuccess | TextParseFailure;

/** Raised when a command needs a modal, which is impossible from a message. */
export class ModalUnsupportedInTextError extends Error {
	public constructor(commandName: string) {
		super(`\`/${commandName}\` opens a modal, which text commands cannot do. Use the slash command instead.`);
		this.name = 'ModalUnsupportedInTextError';
	}
}

const MENTION_USER = /^<@!?(\d{17,20})>$/;
const MENTION_ROLE = /^<@&(\d{17,20})>$/;
const MENTION_CHANNEL = /^<#(\d{17,20})>$/;
const SNOWFLAKE = /^\d{17,20}$/;
const NUMBER_WITH_SUFFIX = /^(-?\d+(?:\.\d+)?)([kmb])$/i;
const TOKEN_PATTERN = /"([^"]*)"|'([^']*)'|(\S+)/g;

/**
 * Reads the option tree of the slash command this piece registered.
 *
 * `ApplicationCommandRegistry#apiCalls` is private in @sapphire/framework, so
 * it is read through `Reflect` and the deployed command cache is used as a
 * fallback. When both are unavailable the caller shows a "use slash" hint
 * instead of guessing.
 */
export function getChatInputOptionData(command: Command): TextOptionData[] | null {
	const registry = Reflect.get(command, 'applicationCommandRegistry') as unknown as
		| { apiCalls?: Array<{ builtData?: { name?: string; options?: TextOptionData[] } }> }
		| undefined;
	const calls = registry?.apiCalls ?? [];
	const match = calls.find((call) => call?.builtData?.name === command.name) ?? calls.find((call) => call?.builtData?.name);
	if (match?.builtData?.options) return match.builtData.options;

	const deployed = container.client.application?.commands.cache.find((entry) => entry.name === command.name);
	const deployedOptions = deployed ? (Reflect.get(deployed, 'options') as TextOptionData[] | undefined) : undefined;
	return Array.isArray(deployedOptions) ? deployedOptions : null;
}

/** Splits a raw message body on whitespace, honouring "quoted strings". */
export function tokenize(input: string): string[] {
	const tokens: string[] = [];
	for (const match of input.matchAll(TOKEN_PATTERN)) tokens.push(match[1] ?? match[2] ?? match[3]);
	return tokens;
}

function prefixesFor(message: Message): string[] {
	const botId = message.client?.user?.id;
	const defaults = container.client?.options?.defaultPrefix;
	const list = new Set<string>();
	if (botId) {
		list.add(`<@${botId}>`);
		list.add(`<@!${botId}>`);
	}
	const guildPrefix = message.guildId ? getGuildPrefixFromCache(message.guildId) : null;
	if (guildPrefix) list.add(guildPrefix);
	if (config.bot.defaultPrefix) list.add(config.bot.defaultPrefix);
	if (typeof defaults === 'string') list.add(defaults);
	else if (Array.isArray(defaults)) {
		for (const entry of defaults) if (typeof entry === 'string') list.add(entry);
	}
	return [...list].filter((entry) => entry.length > 0).sort((a, b) => b.length - a.length);
}

/**
 * Returns the argument tokens of a message, i.e. everything after the
 * invocation (`xban @user reason` → `['@user', 'reason']`).
 */
export function splitInvocation(command: Command, message: Message): string[] {
	const tokens = tokenize(message.content.trim());
	const names = new Set([command.name.toLowerCase(), ...command.aliases.map((alias) => alias.toLowerCase())]);
	const prefixes = prefixesFor(message);

	for (let index = 0; index < Math.min(tokens.length, 3); index += 1) {
		const raw = tokens[index];
		const lower = raw.toLowerCase();
		if (names.has(lower)) return tokens.slice(index + 1);
		for (const prefix of prefixes) {
			if (!lower.startsWith(prefix.toLowerCase())) continue;
			if (names.has(raw.slice(prefix.length).toLowerCase())) return tokens.slice(index + 1);
		}
	}

	// Sapphire only dispatches real prefixes, so the first token is the invocation.
	return tokens.slice(1);
}

function findMember(message: Message, token: string): GuildMember | null {
	const members = message.guild?.members.cache;
	if (!members) return null;
	const needle = token.replace(/^@/, '').toLowerCase();
	const names = (member: GuildMember) => [member.user.username, member.user.globalName, member.displayName, member.nickname];
	const exact = members.find((member) => names(member).some((name) => name?.toLowerCase() === needle));
	if (exact) return exact;
	const partial = members.filter((member) => names(member).some((name) => name?.toLowerCase().startsWith(needle)));
	return partial.size === 1 ? (partial.first() ?? null) : null;
}

async function resolveUser(message: Message, token: string): Promise<User | null> {
	const mention = MENTION_USER.exec(token);
	if (mention) return message.client.users.fetch(mention[1]).catch(() => null);
	const bare = token.startsWith('@') ? token.slice(1) : token;
	const lower = bare.toLowerCase();
	if (lower === 'me' || lower === 'self') return message.author;
	if (SNOWFLAKE.test(bare)) {
		const cached = message.client.users.cache.get(bare);
		if (cached) return cached;
		return message.client.users.fetch(bare).catch(() => null);
	}
	return findMember(message, bare)?.user ?? null;
}

async function resolveMember(message: Message, token: string): Promise<GuildMember | null> {
	const mention = MENTION_USER.exec(token);
	if (mention) {
		const cached = message.guild?.members.cache.get(mention[1]);
		if (cached) return cached;
		return (await message.guild?.members.fetch(mention[1]).catch(() => null)) ?? null;
	}
	const bare = token.startsWith('@') ? token.slice(1) : token;
	const lower = bare.toLowerCase();
	if (lower === 'me' || lower === 'self') return message.member;
	if (SNOWFLAKE.test(bare)) {
		const cached = message.guild?.members.cache.get(bare);
		if (cached) return cached;
		return (await message.guild?.members.fetch(bare).catch(() => null)) ?? null;
	}
	return findMember(message, bare);
}

function resolveChannel(message: Message, token: string) {
	const channels = message.guild?.channels.cache;
	if (!channels) return null;
	const mention = MENTION_CHANNEL.exec(token);
	if (mention) return channels.get(mention[1]) ?? null;
	const bare = token.startsWith('#') ? token.slice(1) : token;
	if (SNOWFLAKE.test(bare)) return channels.get(bare) ?? null;
	const needle = bare.toLowerCase();
	const exact = channels.find((channel) => channel.name.toLowerCase() === needle);
	if (exact) return exact;
	const partial = channels.filter((channel) => channel.name.toLowerCase().startsWith(needle));
	return partial.size === 1 ? (partial.first() ?? null) : null;
}

function resolveRole(message: Message, token: string) {
	const roles = message.guild?.roles.cache;
	if (!roles) return null;
	const mention = MENTION_ROLE.exec(token);
	if (mention) return roles.get(mention[1]) ?? null;
	const bare = token.startsWith('@') ? token.slice(1) : token;
	if (SNOWFLAKE.test(bare)) return roles.get(bare) ?? null;
	const needle = bare.toLowerCase();
	const exact = roles.find((role) => role.name.toLowerCase() === needle);
	if (exact) return exact;
	const partial = roles.filter((role) => role.name.toLowerCase().startsWith(needle));
	return partial.size === 1 ? (partial.first() ?? null) : null;
}

function parseNumberToken(token: string): number | null {
	const cleaned = token.replace(/[, _]/g, '').trim();
	const short = NUMBER_WITH_SUFFIX.exec(cleaned);
	if (short) {
		const scale = { k: 1_000, m: 1_000_000, b: 1_000_000_000 }[short[2].toLowerCase() as 'k' | 'm' | 'b'];
		return Number(short[1]) * scale;
	}
	const value = Number(cleaned);
	return Number.isFinite(value) ? value : null;
}

function parseBooleanToken(token: string): boolean | null {
	switch (token.toLowerCase()) {
		case 'true':
		case 'yes':
		case 'y':
		case 'on':
		case 'enable':
		case 'enabled':
		case '1':
			return true;
		case 'false':
		case 'no':
		case 'n':
		case 'off':
		case 'disable':
		case 'disabled':
		case '0':
			return false;
		default:
			return null;
	}
}

function matchChoice(choices: NonNullable<TextOptionData['choices']>, token: string) {
	const needle = token.toLowerCase();
	return choices.find((choice) => choice.name.toLowerCase() === needle || String(choice.value).toLowerCase() === needle) ?? null;
}

/** Human readable description of an option, used in usage errors. */
export function describeOption(option: TextOptionData): string {
	if (option.choices?.length) return `one of ${option.choices.map((choice) => `\`${choice.value}\``).join(', ')}`;
	switch (option.type) {
		case ApplicationCommandOptionType.User:
			return 'a user (@mention, ID or name)';
		case ApplicationCommandOptionType.Channel:
			return 'a channel (#mention, ID or name)';
		case ApplicationCommandOptionType.Role:
			return 'a role (@mention, ID or name)';
		case ApplicationCommandOptionType.Integer:
			return 'a whole number';
		case ApplicationCommandOptionType.Number:
			return 'a number';
		case ApplicationCommandOptionType.Boolean:
			return 'true/false';
		case ApplicationCommandOptionType.Attachment:
			return 'an attachment on your message';
		default:
			return 'text';
	}
}

/** Builds a `xcommand <subcommand> <options>` usage line from the builder data. */
export function buildUsageString(command: Command, data: TextOptionData[] | null): string {
	const root = `x${command.name}`;
	if (!data?.length) return root;
	const groups = data.filter((option) => option.type === ApplicationCommandOptionType.SubcommandGroup);
	const subcommands = data.filter((option) => option.type === ApplicationCommandOptionType.Subcommand);
	if (groups.length > 0) {
		return groups.map((group) => `${root} ${group.name} [${group.options?.map((option) => option.name).join('|') ?? ''}] ...`).join('\n');
	}
	if (subcommands.length > 0) {
		const single = subcommands.length === 1;
		return subcommands
			.map((subcommand) => `${root} ${single ? `[${subcommand.name}]` : subcommand.name}${formatOptions(subcommand.options ?? [])}`)
			.join('\n');
	}
	return `${root}${formatOptions(data)}`;
}

function formatOptions(options: TextOptionData[]): string {
	const parts = options.map((option) => (option.required ? `<${option.name}>` : `[${option.name}]`));
	return parts.length ? ` ${parts.join(' ')}` : '';
}

async function assignOptionValues(
	options: TextOptionData[],
	tokens: string[],
	message: Message,
	values: Map<string, unknown>
): Promise<string | null> {
	const queue = [...tokens];
	let attachmentIndex = 0;

	for (let index = 0; index < options.length; index += 1) {
		const option = options[index];

		if (option.type === ApplicationCommandOptionType.Attachment) {
			const attachment = message.attachments.at(attachmentIndex);
			attachmentIndex += 1;
			if (attachment) values.set(option.name, attachment);
			continue;
		}

		if (queue.length === 0) continue;

		// The trailing free-text option (usually `reason`) swallows the rest of the line.
		const greedy = option.type === ApplicationCommandOptionType.String && !option.choices && !option.autocomplete && index === options.length - 1;
		const raw = greedy ? queue.splice(0, queue.length).join(' ') : queue.shift()!;

		if (option.type === ApplicationCommandOptionType.String) {
			const choice = option.choices?.length ? matchChoice(option.choices, raw) : null;
			if (option.choices?.length && !choice) return `\`${option.name}\` must be ${describeOption(option)} (got \`${raw}\`).`;
			values.set(option.name, choice ? String(choice.value) : raw);
			continue;
		}

		if (option.type === ApplicationCommandOptionType.Integer || option.type === ApplicationCommandOptionType.Number) {
			const value = parseNumberToken(raw);
			if (value === null) return `\`${option.name}\` must be ${describeOption(option)} (got \`${raw}\`).`;
			values.set(option.name, option.type === ApplicationCommandOptionType.Integer ? Math.trunc(value) : value);
			continue;
		}

		if (option.type === ApplicationCommandOptionType.Boolean) {
			const value = parseBooleanToken(raw);
			if (value === null) return `\`${option.name}\` must be ${describeOption(option)} (got \`${raw}\`).`;
			values.set(option.name, value);
			continue;
		}

		if (option.type === ApplicationCommandOptionType.User) {
			const value = (await resolveMember(message, raw)) ?? (await resolveUser(message, raw));
			if (!value) return `Could not resolve ${describeOption(option)} from \`${raw}\`.`;
			values.set(option.name, value);
			continue;
		}

		if (option.type === ApplicationCommandOptionType.Channel) {
			const value = resolveChannel(message, raw);
			if (!value) return `Could not resolve ${describeOption(option)} from \`${raw}\`.`;
			values.set(option.name, value);
			continue;
		}

		if (option.type === ApplicationCommandOptionType.Role) {
			const value = resolveRole(message, raw);
			if (!value) return `Could not resolve ${describeOption(option)} from \`${raw}\`.`;
			values.set(option.name, value);
			continue;
		}

		if (option.type === ApplicationCommandOptionType.Mentionable) {
			const value = (await resolveUser(message, raw)) ?? resolveRole(message, raw);
			if (!value) return `Could not resolve ${describeOption(option)} from \`${raw}\`.`;
			values.set(option.name, value);
			continue;
		}

		values.set(option.name, raw);
	}

	return null;
}

/** Turns a message body into option values for the resolved (sub)command. */
export async function parseTextArguments(command: Command, message: Message, data: TextOptionData[] | null): Promise<TextParseResult> {
	if (!data) {
		return { ok: false, error: `Text usage for \`/${command.name}\` isn't available right now — use the slash command instead.` };
	}

	const values = new Map<string, unknown>();
	let remaining = splitInvocation(command, message);
	let subcommand: string | null = null;
	let subcommandGroup: string | null = null;
	let scope = data;

	const groups = data.filter((option) => option.type === ApplicationCommandOptionType.SubcommandGroup);
	if (groups.length > 0) {
		const group = remaining.length > 0 ? groups.find((entry) => entry.name.toLowerCase() === remaining[0].toLowerCase()) : undefined;
		if (!group) return { ok: false, error: `Pick one of: ${groups.map((entry) => `\`${entry.name}\``).join(', ')}.` };
		subcommandGroup = group.name;
		scope = group.options ?? [];
		remaining = remaining.slice(1);
	}

	const subcommands = scope.filter((option) => option.type === ApplicationCommandOptionType.Subcommand);
	let optionData = scope;
	if (subcommands.length > 0) {
		const picked = remaining.length > 0 ? subcommands.find((entry) => entry.name.toLowerCase() === remaining[0].toLowerCase()) : undefined;
		if (picked) {
			subcommand = picked.name;
			optionData = picked.options ?? [];
			remaining = remaining.slice(1);
		} else if (subcommands.length === 1) {
			// Single-subcommand commands (`xeconomy bank`) treat the token as an option.
			subcommand = subcommands[0].name;
			optionData = subcommands[0].options ?? [];
		} else {
			return { ok: false, error: `Pick one of: ${subcommands.map((entry) => `\`${entry.name}\``).join(', ')}.` };
		}
	}

	const failure = await assignOptionValues(optionData, remaining, message, values);
	if (failure) return { ok: false, error: failure };

	for (const option of optionData) {
		if (option.required && !values.has(option.name)) {
			return { ok: false, error: `Missing required option \`${option.name}\` — expected ${describeOption(option)}.` };
		}
	}

	return { ok: true, subcommand, subcommandGroup, values };
}

function createOptionResolver(parsed: TextParseSuccess) {
	const read = (name: string, required: boolean) => {
		const value = parsed.values.get(name);
		if (value === undefined && required) throw new Error(`Text usage is missing required option "${name}".`);
		return value;
	};
	const isMember = (value: unknown): value is GuildMember => typeof value === 'object' && value !== null && 'user' in (value as object);
	const unwrapUser = (value: unknown) => (isMember(value) ? value.user : value);

	return {
		getSubcommand: (required = true) => {
			if (parsed.subcommand === null && required) throw new Error('Text usage is missing a subcommand.');
			return parsed.subcommand;
		},
		getSubcommandGroup: (required = false) => {
			if (parsed.subcommandGroup === null && required) throw new Error('Text usage is missing a subcommand group.');
			return parsed.subcommandGroup;
		},
		getString: (name: string, required = false) => {
			const value = read(name, required);
			return value === undefined ? null : String(value);
		},
		getInteger: (name: string, required = false) => {
			const value = read(name, required);
			return value === undefined ? null : Math.trunc(Number(value));
		},
		getNumber: (name: string, required = false) => {
			const value = read(name, required);
			return value === undefined ? null : Number(value);
		},
		getBoolean: (name: string, required = false) => {
			const value = read(name, required);
			return value === undefined ? null : Boolean(value);
		},
		getUser: (name: string, required = false) => unwrapUser(read(name, required)) ?? null,
		getMember: (name: string, required = false) => {
			const value = read(name, required);
			if (value === undefined) return null;
			return isMember(value) ? value : null;
		},
		getChannel: (name: string, required = false) => read(name, required) ?? null,
		getRole: (name: string, required = false) => read(name, required) ?? null,
		getMentionable: (name: string, required = false) => read(name, required) ?? null,
		getAttachment: (name: string, required = false) => read(name, required) ?? null,
		getFocused: () => '',
		get: (name: string, required = false) => read(name, required) ?? null,
		data: [...parsed.values.entries()].map(([name, value]) => ({ name, type: ApplicationCommandOptionType.String, value })),
		resolve: () => undefined
	};
}

/**
 * Builds a `ChatInputCommandInteraction`-shaped object backed by a message.
 * Replies go to the channel (or a DM when the command asked for an ephemeral
 * response); collectors work because real `Message` objects are returned.
 */
export function createTextCommandInteraction(command: Command, message: Message, parsed: TextParseSuccess): Command.ChatInputCommandInteraction {
	let response: Message | null = null;
	const resolver = createOptionResolver(parsed);

	const stripInteractionFlags = (payload: unknown): unknown => {
		if (payload === null || typeof payload !== 'object') return payload;
		const clone: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
		if (typeof clone.flags === 'number') {
			const cleaned = clone.flags & ~MessageFlags.Ephemeral;
			if (cleaned === 0) delete clone.flags;
			else clone.flags = cleaned;
		}
		delete clone.fetchReply;
		delete clone.withResponse;
		delete clone.ephemeral;
		return clone;
	};

	const wantsEphemeral = (payload: unknown): boolean => {
		if (payload === null || typeof payload !== 'object') return false;
		const record = payload as Record<string, unknown>;
		if (record.ephemeral === true) return true;
		return typeof record.flags === 'number' && (record.flags & MessageFlags.Ephemeral) !== 0;
	};

	const deliver = async (payload: unknown): Promise<Message> => {
		const cleaned = stripInteractionFlags(payload) as never;
		if (wantsEphemeral(payload)) {
			// Private responses become DMs; when the user blocks DMs we post in the channel.
			const dm = await message.author.send(cleaned).catch(() => null);
			if (dm) return dm;
		}
		return message.reply(cleaned);
	};

	const adapter = {
		commandName: command.name,
		id: message.id,
		applicationId: message.client.application?.id ?? message.client.user?.id ?? '',
		type: 2,
		user: message.author,
		member: message.member,
		guild: message.guild,
		guildId: message.guildId,
		channel: message.channel,
		channelId: message.channelId,
		client: message.client,
		locale: message.guild?.preferredLocale ?? 'en-US',
		guildLocale: message.guild?.preferredLocale ?? null,
		createdTimestamp: message.createdTimestamp,
		createdAt: message.createdAt,
		memberPermissions: message.member?.permissions ?? null,
		appPermissions: message.guild?.members.me?.permissions ?? null,
		token: '',
		options: resolver,
		inGuild: () => Boolean(message.guildId),
		inCachedGuild: () => Boolean(message.guild),
		inRawGuild: () => false,
		isChatInputCommand: () => true,
		isCommand: () => true,
		isContextMenuCommand: () => false,
		isAutocomplete: () => false,
		isMessageComponent: () => false,
		isButton: () => false,
		isStringSelectMenu: () => false,
		isAnySelectMenu: () => false,
		isModalSubmit: () => false,
		isRepliable: () => true,
		isUserContextMenuCommand: () => false,
		isMessageContextMenuCommand: () => false,
		async deferReply() {
			return undefined;
		},
		async reply(payload: unknown) {
			response = await deliver(payload);
			return response;
		},
		async editReply(payload: unknown) {
			if (!response) return adapter.reply(payload);
			response = (await response.edit(stripInteractionFlags(payload) as never)) as Message;
			return response;
		},
		async followUp(payload: unknown) {
			return deliver(payload);
		},
		async fetchReply() {
			return response ?? message;
		},
		async deleteReply() {
			if (response) await response.delete().catch(() => null);
		},
		async respond() {
			return undefined;
		},
		async update() {
			return undefined;
		},
		async deferUpdate() {
			return undefined;
		},
		async showModal() {
			throw new ModalUnsupportedInTextError(command.name);
		},
		async awaitModalSubmit() {
			throw new ModalUnsupportedInTextError(command.name);
		},
		toJSON() {
			return {};
		}
	};

	Object.defineProperty(adapter, 'deferred', { get: () => false, enumerable: true });
	Object.defineProperty(adapter, 'replied', { get: () => response !== null, enumerable: true });
	Object.defineProperty(adapter, 'ephemeral', { get: () => false, enumerable: true });

	return adapter as unknown as Command.ChatInputCommandInteraction;
}

/**
 * Runnable self-check for the text→slash parser (no Discord connection needed).
 *
 * bun -e "import('./src/lib/utils/textCommandInteraction.ts').then((m) => m.__textCommandSelfCheck()).then(() => console.log('text-ok')).catch((e) => { console.error(e); process.exit(1); })"
 */
export async function __textCommandSelfCheck(): Promise<void> {
	const { Collection, ApplicationCommandOptionType: Type } = await import('discord.js');

	const member = {
		id: '111111111111111111',
		displayName: 'Manu',
		nickname: null,
		user: { id: '111111111111111111', username: 'manu', globalName: 'Manu' }
	};
	const role = { id: '222222222222222222', name: 'Moderator' };
	const channel = { id: '333333333333333333', name: 'general' };
	const attachment = { id: '444444444444444444', name: 'proof.png' };

	const makeMessage = (content: string) =>
		({
			content,
			guildId: null,
			channelId: '999999999999999999',
			attachments: new Collection([['444444444444444444', attachment]]),
			author: member.user,
			member,
			client: { users: { cache: new Collection(), fetch: async () => null }, application: null },
			guild: {
				members: { cache: new Collection([[member.id, member]]) },
				roles: { cache: new Collection([[role.id, role]]) },
				channels: { cache: new Collection([[channel.id, channel]]) }
			}
		}) as never;

	const command = { name: 'sample', aliases: ['smp'] } as never;
	const run = async (content: string, options: TextOptionData[]) => parseTextArguments(command, makeMessage(content), options);
	const assert = (condition: boolean, label: string) => {
		if (!condition) throw new Error(`text self-check failed: ${label}`);
	};

	// 1. user mention + trailing free-text reason (ban/kick style).
	const ban = await run('xsample <@111111111111111111> spamming and rude', [
		{ name: 'user', type: Type.User, required: true },
		{ name: 'reason', type: Type.String }
	]);
	assert(ban.ok, 'ban parses');
	if (ban.ok) {
		assert(ban.values.get('user') === member, 'mention resolves to member');
		assert(ban.values.get('reason') === 'spamming and rude', 'reason is greedy');
	}

	// 2. plain-name user lookup + numeric amount with a suffix.
	const purge = await run('xsample manu 1k cleanup', [
		{ name: 'user', type: Type.User, required: true },
		{ name: 'amount', type: Type.Integer, required: true },
		{ name: 'reason', type: Type.String }
	]);
	assert(purge.ok, 'purge parses');
	if (purge.ok) {
		assert(purge.values.get('user') === member, 'name resolves to member');
		assert(purge.values.get('amount') === 1000, '1k -> 1000');
		assert(purge.values.get('reason') === 'cleanup', 'reason kept');
	}

	// 3. channel/role/boolean mix.
	const settings = await run('xsample #general @Moderator true', [
		{ name: 'channel', type: Type.Channel, required: true },
		{ name: 'role', type: Type.Role, required: true },
		{ name: 'silent', type: Type.Boolean }
	]);
	assert(settings.ok, 'settings parses');
	if (settings.ok) {
		assert(settings.values.get('channel') === channel, '#channel resolves');
		assert(settings.values.get('role') === role, '@role resolves');
		assert(settings.values.get('silent') === true, 'boolean parses');
	}

	// 4. choice option + optional user (emote style).
	const emote = await run('xsample wave @111111111111111111', [
		{ name: 'emote', type: Type.String, required: true, choices: [{ name: 'Wave', value: 'wave' }, { name: 'Hug', value: 'hug' }] },
		{ name: 'user', type: Type.User }
	]);
	assert(emote.ok, 'emote parses');
	if (emote.ok) {
		assert(emote.values.get('emote') === 'wave', 'choice matched case-insensitively');
		assert(emote.values.get('user') === member, 'optional user resolved');
	}

	// 5. quoted strings + attachment option.
	const quoted = await run('xsample #general "hello world"', [
		{ name: 'channel', type: Type.Channel, required: true },
		{ name: 'title', type: Type.String, required: true }
	]);
	assert(quoted.ok && quoted.values.get('title') === 'hello world', 'quoted string kept whole');

	const upload = await run('xsample', [{ name: 'file', type: Type.Attachment, required: true }]);
	assert(upload.ok && upload.values.get('file') === attachment, 'attachment picked up');

	// 6. single-subcommand commands may omit the subcommand name (economy/bank-upgrade style).
	const economy = await run('xsample bank', [
		{
			name: 'leaderboard',
			type: Type.Subcommand,
			options: [
				{ name: 'type', type: Type.String, choices: [{ name: 'Bank', value: 'bank' }] },
				{ name: 'global', type: Type.Boolean }
			]
		}
	]);
	assert(economy.ok && economy.subcommand === 'leaderboard', 'single subcommand auto-selected');
	assert(economy.ok && economy.values.get('type') === 'bank', 'subcommand option parsed');
	assert(economy.ok && economy.values.get('global') === undefined, 'optional boolean left unset');

	// 7. multiple subcommands pick by name; unknown ones are reported.
	const automod = await run('xsample enable keyword', [
		{
			name: 'enable',
			type: Type.Subcommand,
			options: [{ name: 'type', type: Type.String, required: true, choices: [{ name: 'Keyword', value: 'keyword' }] }]
		},
		{ name: 'disable', type: Type.Subcommand, options: [{ name: 'type', type: Type.String, required: true }] }
	]);
	assert(automod.ok && automod.subcommand === 'enable', 'subcommand selected');
	assert(automod.ok && automod.values.get('type') === 'keyword', 'subcommand choice parsed');

	const badSub = await run('xsample nonsense', [
		{ name: 'enable', type: Type.Subcommand, options: [] },
		{ name: 'disable', type: Type.Subcommand, options: [] }
	]);
	assert(!badSub.ok, 'unknown subcommand rejected');

	// 8. validation errors surface as messages instead of throwing.
	const missing = await run('xsample', [{ name: 'user', type: Type.User, required: true }]);
	assert(!missing.ok && missing.error.includes('Missing required option'), 'missing required option reported');

	const unknownUser = await run('xsample nobody', [{ name: 'user', type: Type.User, required: true }]);
	assert(!unknownUser.ok && unknownUser.error.includes('Could not resolve'), 'unresolvable user reported');

	const badChoice = await run('xsample hugwave', [
		{ name: 'emote', type: Type.String, required: true, choices: [{ name: 'Wave', value: 'wave' }] }
	]);
	assert(!badChoice.ok && badChoice.error.includes('must be'), 'invalid choice reported');

	// 9. prefix handling: mention prefix, alias, and prefix glued to the name.
	const mentionPrefix = await run('<@555555555555555555> wave @111111111111111111', [
		{ name: 'emote', type: Type.String, required: true, choices: [{ name: 'Wave', value: 'wave' }] },
		{ name: 'user', type: Type.User }
	]);
	assert(mentionPrefix.ok && mentionPrefix.values.get('emote') === 'wave', 'mention prefix handled');

	const alias = await run('xsmp wave', [{ name: 'emote', type: Type.String, required: true, choices: [{ name: 'Wave', value: 'wave' }] }]);
	assert(alias.ok && alias.values.get('emote') === 'wave', 'alias handled');

	// 10. no options at all + missing metadata.
	const bare = await run('xsample', []);
	assert(bare.ok, 'option-less command runs');

	const unknownMetadata = await parseTextArguments(command, makeMessage('xsample'), null);
	assert(!unknownMetadata.ok, 'unknown metadata falls back to a hint');

	// 11. tokenizer sanity.
	assert(tokenize('a "b c" \'d e\'').length === 3, 'tokenizer respects quotes');
	assert(buildUsageString(command, [{ name: 'user', type: Type.User, required: true }, { name: 'reason', type: Type.String }]) === 'xsample <user> [reason]', 'usage string built');
}
