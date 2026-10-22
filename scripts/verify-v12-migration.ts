/**
 * Post-migration sanity checks. Read-only.
 *   bun scripts/verify-v12-migration.ts --uri mongodb://host:27017/helix
 */
import mongoose from 'mongoose';
import { getAllModuleKeys } from '../src/config/modules';
import { Guild } from '../src/models/Guild';
import { GuildXp } from '../src/models/GuildXp';
import { User } from '../src/models/User';

const uri = process.argv.find((a) => a.startsWith('--uri='))?.slice(6)
	?? process.argv[process.argv.indexOf('--uri') + 1]
	?? process.env.MONGO;
if (!uri) {
	console.error('usage: bun scripts/verify-v12-migration.ts --uri <mongodb-uri>');
	process.exit(2);
}

const fail: string[] = [];
const ok = (label: string, cond: boolean, detail = '') => {
	console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
	if (!cond) fail.push(label);
};

async function main() {
	await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
	console.log(`db: ${mongoose.connection.name}\n`);

	const guilds = await Guild.countDocuments({});
	const xps = await GuildXp.countDocuments({});
	const users = await User.countDocuments({});
	console.log('== COUNTS ==');
	ok('guilds imported', guilds > 0, String(guilds));
	ok('guildxps imported', xps > 0, String(xps));

	console.log('\n== GUILD SHAPE ==');
	const sample = await Guild.findOne({ welcomeChannelId: { $ne: null } }).lean();
	ok('guild doc readable', Boolean(sample));

	// `modules` is a Mixed path, so Mongoose adds no subdocument defaults on
	// upsert: a partial write silently reads as "module disabled".
	const moduleKeys = getAllModuleKeys();
	const allGuilds = await Guild.find({}, { modules: 1, setupWizard: 1 }).lean();
	const missingModules = allGuilds.filter((g) =>
		moduleKeys.some((k) => typeof (g.modules ?? {})[k] !== 'boolean')
	);
	ok(
		'every guild has all module keys',
		missingModules.length === 0,
		`${missingModules.length}/${allGuilds.length} incomplete (${moduleKeys.length} keys expected)`
	);

	// A partial setupWizard fails validation on the next .save().
	const partialWizard = allGuilds.filter((g) => g.setupWizard !== undefined && g.setupWizard !== null);
	ok('no setupWizard left behind', partialWizard.length === 0, `${partialWizard.length} with wizard`);

	const withWelcome = await Guild.countDocuments({ welcomeChannelId: { $ne: null } });
	const welcomeModule = await Guild.countDocuments({
		welcomeChannelId: { $ne: null },
		'modules.welcoming': true
	});
	ok('welcoming module follows channel', withWelcome === welcomeModule, `${welcomeModule}/${withWelcome}`);

	const badPrefix = await Guild.find({ prefix: { $ne: null } }).lean();
	const invalid = badPrefix.filter((g) => !g.prefix || g.prefix.length > 5 || /\s/.test(g.prefix));
	ok('all prefixes valid', invalid.length === 0, `${badPrefix.length} set, ${invalid.length} invalid`);

	console.log('\n== LOG EVENTS ==');
	// logEvents stores literal dotted keys ('member.join'), which a MongoDB query
	// path cannot address — 'logEvents.member.join' would traverse two levels.
	// Check the key directly instead.
	const memberLogDocs = await Guild.find({ memberLogChannelId: { $ne: null } }, { logEvents: 1 }).lean();
	const flatJoin = memberLogDocs.filter((g) => Object.hasOwn(g.logEvents ?? {}, 'member.join')).length;
	const nested = memberLogDocs.filter((g) => {
		const value = (g.logEvents ?? {})['member'];
		return value !== null && typeof value === 'object';
	}).length;
	ok('join/leave enabled where member log set', flatJoin === memberLogDocs.length, `${flatJoin}/${memberLogDocs.length}`);
	ok('logEvents not nested by mistake', nested === 0, `${nested} nested`);

	console.log('\n== XP ==');
	const orphanXp = await GuildXp.aggregate([
		{ $lookup: { from: 'guilds', localField: 'guildId', foreignField: 'guildId', as: 'g' } },
		{ $match: { g: { $size: 0 } } },
		{ $count: 'n' }
	]);
	ok('no xp rows without a guild doc', (orphanXp[0]?.n ?? 0) === 0, String(orphanXp[0]?.n ?? 0));
	const top = await GuildXp.find({}).sort({ xp: -1 }).limit(1).lean();
	ok('top xp present', (top[0]?.xp ?? 0) > 0, String(top[0]?.xp ?? 0));
	const zeroXp = await GuildXp.countDocuments({ xp: { $lte: 0 } });
	ok('no zero-xp rows', zeroXp === 0, String(zeroXp));

	console.log('\n== WARNINGS ==');
	const warned = await User.countDocuments({ 'warnings.0': { $exists: true } });
	ok('warning migrated', warned > 0, `${warned} user(s)`);
	const warnSample = await User.findOne({ 'warnings.0': { $exists: true } }, { warnings: 1, userId: 1 }).lean();
	if (warnSample) {
		const w = warnSample.warnings.at(-1);
		ok('warning has guildId + moderator', Boolean(w?.guildId && w?.moderatorId), JSON.stringify(w));
	}

	console.log(`\n${fail.length === 0 ? 'ALL CHECKS PASSED' : `${fail.length} CHECK(S) FAILED: ${fail.join(', ')}`}`);
	await mongoose.disconnect();
	process.exit(fail.length === 0 ? 0 : 1);
}

main().catch(async (e) => {
	console.error(e);
	await mongoose.disconnect().catch(() => undefined);
	process.exit(1);
});
