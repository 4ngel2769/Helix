#!/usr/bin/env bun
/**
 * One-off migration: Helix v12 (SQLite) -> Helix v10 (MongoDB).
 *
 * Dry run by default. Nothing is written without --apply.
 *
 *   bun scripts/migrate-v12-settings.ts --sqlite ./db.sqlite --uri mongodb://host:27017/helix
 *   bun scripts/migrate-v12-settings.ts --sqlite ./db.sqlite --uri mongodb://host:27017/helix --apply
 *
 * Notes
 *  - Guild settings are upserted; only mapped fields are touched.
 *  - `users` rows are collapsed to GuildXp (points > 0, bots skipped); the
 *    374k historical zero-point rows are deliberately not imported.
 *  - Fields with no v10 target are reported, never silently dropped:
 *      crown_* (weekly crown feature does not exist), starboard_channel_id,
 *      random_color, mod_channel_ids, command_points, auto_kick (0 rows),
 *      verification_message_id (belongs to a message the old bot posted).
 *  - ?member / ?role / ?server placeholders are rewritten to the v10 vocabulary.
 */
import { Database } from 'bun:sqlite';
import mongoose from 'mongoose';
import { getAllModuleKeys, getModuleConfig } from '../src/config/modules';
import { Guild } from '../src/models/Guild';
import { GuildXp } from '../src/models/GuildXp';
import { User } from '../src/models/User';

type OldSettings = {
	guild_id: string;
	guild_name: string | null;
	prefix: string | null;
	system_channel_id: string | null;
	starboard_channel_id: string | null;
	admin_role_id: string | null;
	mod_role_id: string | null;
	mute_role_id: string | null;
	auto_role_id: string | null;
	auto_kick: number | null;
	random_color: number | null;
	mod_channel_ids: string | null;
	disabled_commands: string | null;
	mod_log_id: string | null;
	member_log_id: string | null;
	nickname_log_id: string | null;
	role_log_id: string | null;
	message_edit_log_id: string | null;
	message_delete_log_id: string | null;
	verification_role_id: string | null;
	verification_channel_id: string | null;
	verification_message: string | null;
	verification_message_id: string | null;
	welcome_channel_id: string | null;
	welcome_message: string | null;
	farewell_channel_id: string | null;
	farewell_message: string | null;
	point_tracking: number | null;
	message_points: number | null;
	command_points: number | null;
	voice_points: number | null;
	crown_role_id: string | null;
	crown_channel_id: string | null;
	crown_message: string | null;
	crown_schedule: string | null;
};

type OldWarnRow = {
	user_id: string;
	user_name: string | null;
	guild_id: string;
	warns: string | null;
};

const args = process.argv.slice(2);
/** Reads `--name value` or `--name=value`; boolean flags resolve to 'true'. */
function arg(name: string): string | undefined {
	for (let i = 0; i < args.length; i++) {
		const current = args[i];
		if (current === `--${name}`) {
			const next = args[i + 1];
			if (next && !next.startsWith('--')) return next;
			return 'true';
		}
		if (current.startsWith(`--${name}=`)) return current.slice(current.indexOf('=') + 1);
	}
	return undefined;
}
const flag = (name: string) => arg(name) !== undefined;

const sqlitePath = arg('sqlite');
const uri = arg('uri') ?? process.env.MONGO ?? process.env.MONGO_URI ?? process.env.MONGODB_URI;
const apply = flag('apply');
const limitGuild = arg('guild');
const keepLevelingOff = !flag('enable-leveling');
const force = flag('force');

if (!sqlitePath || !uri) {
	console.error('usage: bun scripts/migrate-v12-settings.ts --sqlite <path> --uri <mongodb-uri> [--apply] [--guild <id>]');
	process.exit(2);
}

/** Rewrite v12 placeholder tokens to the v10 closed vocabulary. */
function convertMessage(text: string | null | undefined): string | null {
	if (text === null || text === undefined) return null;
	const converted = text
		.replace(/\?member\b/g, '{{user.mention}}')
		.replace(/\?user\b/g, '{{user.name}}')
		.replace(/\?role\b/g, '{{role.name}}')
		.replace(/\?server\b/g, '{{server.name}}')
		.replace(/\?guild\b/g, '{{server.name}}');
	return converted.length > 0 ? converted : null;
}

/** Space-delimited v12 column -> string[] (deduped, trimmed). */
function splitIds(value: string | null | undefined): string[] {
	if (!value) return [];
	return [...new Set(value.split(/\s+/).map((s) => s.trim()).filter(Boolean))];
}

const dropped = {
	crownRole: 0,
	crownChannel: 0,
	crownMessage: 0,
	crownSchedule: 0,
	starboard: 0,
	randomColor: 0,
	modChannelIds: 0,
	commandPoints: 0,
	autoKick: 0,
	verificationMessageId: 0
};
const prefixWarnings: string[] = [];

/**
 * Every module key with its schema default. `modules` is a Mixed path, so
 * Mongoose applies no subdocument defaults to it: a partial write leaves the
 * other keys undefined, which modules read as "disabled".
 */
function moduleDefaults(): Record<string, boolean> {
	const out: Record<string, boolean> = {};
	for (const key of getAllModuleKeys()) out[key] = getModuleConfig(key)?.defaultEnabled ?? true;
	return out;
}

function buildGuildUpdate(row: OldSettings, existingLogEvents?: Record<string, boolean>): Record<string, unknown> {
	const set: Record<string, unknown> = { guildId: row.guild_id };

	// prefix: v10 accepts null or 1..5 chars with no whitespace.
	let prefix: string | null = row.prefix?.trim() || null;
	if (prefix && (prefix.length > 5 || /\s/.test(prefix))) {
		prefixWarnings.push(`${row.guild_id}: rejected prefix ${JSON.stringify(prefix)}`);
		prefix = null;
	} else if (prefix && prefix.length > 3) {
		prefixWarnings.push(`${row.guild_id}: ${JSON.stringify(prefix)} is valid for the API but /setprefix caps at 3`);
	}
	if (prefix) set.prefix = prefix;

	if (row.system_channel_id) set.systemChannelId = row.system_channel_id;
	if (row.admin_role_id) set.adminRoleId = row.admin_role_id;
	if (row.mod_role_id) set.modRoleId = row.mod_role_id;
	if (row.mute_role_id) set.muteRoleId = row.mute_role_id;
	if (row.auto_role_id) set.autoroleId = row.auto_role_id;

	const disabled = splitIds(row.disabled_commands);
	if (disabled.length) set.disabledCommands = disabled;

	// Legacy log channels double as the v10 fallback channel per event.
	if (row.mod_log_id) set.modLogChannelId = row.mod_log_id;
	if (row.member_log_id) set.memberLogChannelId = row.member_log_id;
	if (row.nickname_log_id) set.nicknameLogChannelId = row.nickname_log_id;
	if (row.role_log_id) set.roleLogChannelId = row.role_log_id;
	if (row.message_edit_log_id) set.messageEditLogChannelId = row.message_edit_log_id;
	if (row.message_delete_log_id) set.messageDeleteLogChannelId = row.message_delete_log_id;

	// v10 member join/leave default OFF, but the old bot logged them to member_log_id.
	// logEvents keys contain dots, so the whole object must be written ($set on a
	// dotted path would nest it as { member: { join: true } } instead of 'member.join').
	if (row.member_log_id) {
		set.logEvents = { ...(existingLogEvents ?? {}), 'member.join': true, 'member.leave': true };
	}

	const welcomeMessage = convertMessage(row.welcome_message);
	if (row.welcome_channel_id) set.welcomeChannelId = row.welcome_channel_id;
	if (welcomeMessage) set.welcomeMessage = welcomeMessage;
	const farewellMessage = convertMessage(row.farewell_message);
	if (row.farewell_channel_id) set.farewellChannelId = row.farewell_channel_id;
	if (farewellMessage) set.farewellMessage = farewellMessage;

	if (row.verification_role_id) set.verificationRoleId = row.verification_role_id;
	if (row.verification_channel_id) set.verificationChannelId = row.verification_channel_id;
	const verificationMessage = convertMessage(row.verification_message);
	if (verificationMessage) set.verificationMessage = verificationMessage;

	// Module switches follow the settings that were actually in use. Written as
	// one whole object: dotted `$set` keys would also bury the Mixed subdocument
	// defaults, and a partial object reads as "module disabled" for every key
	// that is missing.
	const welcoming = Boolean(row.welcome_channel_id || row.farewell_channel_id);
	const verification = Boolean(row.verification_role_id && row.verification_channel_id);
	const leveling = !keepLevelingOff && row.point_tracking === 1;
	const modules = moduleDefaults();
	modules.welcoming = welcoming;
	modules.verification = verification;
	modules.leveling = leveling;
	set.modules = modules;
	// Legacy mirrors, kept in sync because findOneAndUpdate bypasses pre('save').
	set.isWelcomingModule = welcoming;
	set.isVerificationModule = verification;

	if (leveling) {
		set['leveling.xpMin'] = 15;
		set['leveling.xpMax'] = 25;
		set['leveling.cooldownSeconds'] = 60;
		set['leveling.voiceXpPerMinute'] = Math.max(0, row.voice_points ?? 0);
	}

	// auto_kick had no rows, but map it if an old backup does have one.
	if (row.auto_kick && row.auto_kick > 0) {
		set['warnSettings.thresholds'] = [{ count: row.auto_kick, action: 'kick' }];
		dropped.autoKick++;
	}

	// Lossy fields — counted for the report.
	if (row.crown_role_id) dropped.crownRole++;
	if (row.crown_channel_id) dropped.crownChannel++;
	if (row.crown_message) dropped.crownMessage++;
	if (row.crown_schedule) dropped.crownSchedule++;
	if (row.starboard_channel_id) dropped.starboard++;
	if (row.random_color) dropped.randomColor++;
	if (splitIds(row.mod_channel_ids).length) dropped.modChannelIds++;
	if ((row.command_points ?? 1) !== 1) dropped.commandPoints++;
	if (row.verification_message_id) dropped.verificationMessageId++;

	return set;
}

function parseOldDate(value: string | null | undefined): Date | null {
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function main() {
	console.log(`sqlite : ${sqlitePath}`);
	console.log(`mongo  : ${uri.replace(/:\/\/[^@/]*@/, '://***@')}`);
	console.log(`mode   : ${apply ? 'APPLY' : 'DRY RUN'}`);
	console.log('');

	const db = new Database(sqlitePath, { readonly: true });
	const settings = db.query('select * from settings order by guild_id').all() as OldSettings[];
	const filtered = limitGuild ? settings.filter((s) => s.guild_id === limitGuild) : settings;
	if (limitGuild && filtered.length === 0) {
		console.error(`no settings row for guild ${limitGuild}`);
		process.exit(1);
	}

	await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
	const dbName = mongoose.connection.name;

	if (apply && !force) {
		const existing = await Guild.countDocuments({});
		if (existing > 50) {
			console.error(
				`refusing to apply: ${dbName} already has ${existing} guild docs. Re-run with --force if this is intentional.`
			);
			await mongoose.disconnect();
			process.exit(1);
		}
	}

	const existingDocs = await Guild.find({}, { guildId: 1, logEvents: 1 }).lean();
	const existingIds = new Set(existingDocs.map((g) => g.guildId));
	const existingLogEvents = new Map(
		existingDocs.map((g) => [g.guildId, (g.logEvents ?? {}) as Record<string, boolean>])
	);
	const updates = filtered.map((row) => buildGuildUpdate(row, existingLogEvents.get(row.guild_id)));
	const toInsert = updates.filter((u) => !existingIds.has(u.guildId as string)).length;
	const toUpdate = updates.length - toInsert;

	// --show <guildId> prints exactly what would be written, then exits.
	const showId = arg('show');
	if (showId) {
		const doc = updates.find((u) => u.guildId === showId);
		console.log(JSON.stringify(doc ?? { error: `no settings row for ${showId}` }, null, 2));
		await mongoose.disconnect();
		return;
	}

	console.log('== GUILDS ==');
	console.log(`  rows in sqlite      : ${settings.length}`);
	console.log(`  to insert           : ${toInsert}`);
	console.log(`  to update           : ${toUpdate}`);
	console.log(`  existing in ${dbName.padEnd(9)}: ${existingIds.size}`);
	console.log(`  leveling enabled    : ${keepLevelingOff ? '0 (XP imported, module left off)' : 'point_tracking=1 rows'}`);
	console.log('');

	const xpRows = db
		.query(
			`select guild_id, user_id,
			        case when total_points > 0 then total_points else points end as xp
			 from users
			 where bot = 0 and (total_points > 0 or points > 0)
			 ${limitGuild ? 'and guild_id = ?' : ''}
			 order by xp desc`
		)
		.all(...(limitGuild ? [limitGuild] : [])) as Array<{ guild_id: string; user_id: string; xp: number }>;

	const totalXp = xpRows.reduce((a, r) => a + r.xp, 0);
	console.log('== XP ==');
	console.log(`  rows imported       : ${xpRows.length}`);
	console.log(`  sum xp              : ${totalXp.toLocaleString()}`);
	console.log(`  max xp              : ${xpRows[0]?.xp.toLocaleString() ?? 0}`);
	console.log(`  guilds covered      : ${new Set(xpRows.map((r) => r.guild_id)).size}`);
	console.log(
		`  skipped             : ${
			(db.query('select count(*) c from users where bot = 1').get() as { c: number }).c
		} bot rows, ${
			(db.query('select count(*) c from users where bot = 0 and total_points = 0 and points = 0').get() as { c: number }).c
		} zero-point rows`
	);
	console.log('');

	const warnRows = db
		.query(
			`select user_id, user_name, guild_id, warns from users
			 where warns is not null and trim(warns) not in ('', '[]', '{}')
			 ${limitGuild ? 'and guild_id = ?' : ''}`
		)
		.all(...(limitGuild ? [limitGuild] : [])) as OldWarnRow[];

	console.log('== WARNINGS ==');
	console.log(`  rows with warns     : ${warnRows.length}`);
	console.log('');

	console.log('== DROPPED (no v10 target) ==');
	for (const [key, count] of Object.entries(dropped)) {
		if (count > 0) console.log(`  ${key.padEnd(22)} ${count}`);
	}
	if (prefixWarnings.length) {
		console.log('\n== PREFIX NOTES ==');
		for (const note of prefixWarnings) console.log(`  ${note}`);
	}

	if (!apply) {
		console.log('\nDry run complete. Re-run with --apply to write.');
		await mongoose.disconnect();
		return;
	}

	console.log('\n== APPLYING ==');
	let written = 0;
	for (const set of updates) {
		await Guild.updateOne({ guildId: set.guildId as string }, { $set: set }, { upsert: true });
		written++;
		if (written % 50 === 0) console.log(`  guilds ${written}/${updates.length}`);
	}
	console.log(`  guilds written      : ${written}`);

	// Mongoose's setDefaultsOnInsert applies the setupWizard.updatedAt default to
	// new docs, leaving a partial setupWizard that fails validation on the next
	// .save(): "setupWizard.step: Path `step` is required." No imported guild is
	// mid-wizard, so drop the incomplete ones at the driver level.
	const cleanedWizards = await Guild.collection.updateMany(
		{ $or: [{ 'setupWizard.step': { $exists: false } }, { 'setupWizard.startedBy': { $exists: false } }] },
		{ $unset: { setupWizard: '' } }
	);
	console.log(`  setupWizard cleaned : ${cleanedWizards.modifiedCount}`);

	const ops = xpRows.map((r) => ({
		updateOne: {
			filter: { guildId: r.guild_id, userId: r.user_id },
			update: { $set: { xp: r.xp } },
			upsert: true
		}
	}));
	let xpWritten = 0;
	for (let i = 0; i < ops.length; i += 1000) {
		const chunk = ops.slice(i, i + 1000);
		await GuildXp.bulkWrite(chunk, { ordered: false });
		xpWritten += chunk.length;
		if (xpWritten % 1000 === 0) console.log(`  xp ${xpWritten}/${ops.length}`);
	}
	console.log(`  xp written          : ${xpWritten}`);

	let warnsWritten = 0;
	for (const row of warnRows) {
		let parsed: { warns?: Array<{ mod?: string; date?: string; reason?: string }> } = {};
		try {
			parsed = JSON.parse(row.warns ?? '{}');
		} catch {
			console.log(`  ! unparseable warns for ${row.user_id}@${row.guild_id}, skipped`);
			continue;
		}
		for (const warn of parsed.warns ?? []) {
			const timestamp = parseOldDate(warn.date) ?? new Date();
			await User.updateOne(
				{ userId: row.user_id },
				{
					$setOnInsert: {
						userId: row.user_id,
						username: row.user_name ?? row.user_id,
						discriminator: '0'
					},
					$push: {
						warnings: {
							guildId: row.guild_id,
							reason: warn.reason ?? '(no reason recorded)',
							moderatorId: warn.mod ?? '0',
							moderatorTag: warn.mod ?? 'unknown',
							timestamp,
							active: true,
							source: 'manual'
						}
					}
				},
				{ upsert: true }
			);
			warnsWritten++;
		}
	}
	console.log(`  warnings written    : ${warnsWritten}`);

	const finalGuilds = await Guild.countDocuments({});
	const finalXp = await GuildXp.countDocuments({});
	console.log(`\ndone. ${dbName}: guilds=${finalGuilds} guildxps=${finalXp}`);
	await mongoose.disconnect();
}

main().catch(async (error) => {
	console.error(error);
	await mongoose.disconnect().catch(() => undefined);
	process.exit(1);
});
