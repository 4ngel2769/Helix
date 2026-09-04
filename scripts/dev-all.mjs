#!/usr/bin/env bun
/**
 * Combined dev boot: bot first, dashboard once the bot API is up — one terminal.
 *
 * - Bot output passes through untouched (existing logging system).
 * - Dashboard output lines are re-tagged ` - DASH  - ` in magenta, mimicking the
 *   bot's `TIMESTAMP - LEVEL - message` shape.
 *
 * Usage: bun run dev:all   (Ctrl+C stops everything)
 */
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BOT_HEALTH = `http://localhost:${process.env.DASHBOARD_PORT || '8080'}/api/health`;
const NO_COLOR = 'NO_COLOR' in process.env;

const MAGENTA = NO_COLOR ? '' : '\x1b[35m';
const RESET = NO_COLOR ? '' : '\x1b[0m';

function timestamp() {
	const d = new Date();
	const p = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function devLog(message) {
	console.log(`${timestamp()} - [dev] - ${message}`);
}

/** Pipe a child process, optionally re-tagging every line. */
function attach(child, tag) {
	for (const stream of ['stdout', 'stderr']) {
		let buffer = '';
		child[stream]?.on('data', (chunk) => {
			buffer += chunk.toString();
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';
			for (const line of lines) {
				if (tag) process[stream].write(`${timestamp()} - ${MAGENTA}${tag}${RESET}  - ${line}\n`);
				else process[stream].write(`${line}\n`);
			}
		});
	}
}

const children = [];

function shutdown() {
	devLog('stopping everything…');
	for (const child of children) {
		try {
			if (process.platform === 'win32' && child.pid) {
				spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
			} else {
				child.kill('SIGINT');
			}
		} catch {
			// already gone
		}
	}
	setTimeout(() => process.exit(0), 800).unref?.();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function waitForBot(tries = 45) {
	for (let i = 0; i < tries; i += 1) {
		try {
			const res = await fetch(BOT_HEALTH);
			if (res.ok) return true;
		} catch {
			// not up yet
		}
		await new Promise((r) => setTimeout(r, 2000));
	}
	return false;
}

devLog('starting bot…');
const bot = spawn('bun', ['run', 'dev'], { cwd: ROOT, shell: process.platform === 'win32' });
children.push(bot);
attach(bot, null);
bot.on('exit', (code) => {
	devLog(`bot exited (code ${code}) — stopping dashboard too.`);
	shutdown();
});

devLog('waiting for bot API…');
const botUp = await waitForBot();
if (botUp) devLog('bot API is up — starting dashboard…');
else devLog('bot API did not come up in time — starting dashboard anyway (handshake will retry)…');

const dash = spawn('bun', ['run', 'dev'], { cwd: path.join(ROOT, 'dashboard'), shell: process.platform === 'win32' });
children.push(dash);
attach(dash, 'DASH');
dash.on('exit', (code) => devLog(`dashboard exited (code ${code}).`));
