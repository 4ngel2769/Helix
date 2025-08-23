import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

let replies: Record<string, string> = {};

export function loadReplies() {
	const file = path.join(__dirname, '../../../defaultreplies.yaml');
	if (fs.existsSync(file)) {
		replies = yaml.load(fs.readFileSync(file, 'utf8')) as Record<string, string>;
	}
}

export function getReply(key: string, vars: Record<string, string> = {}) {
	let template = replies[key] || '';
	for (const [k, v] of Object.entries(vars)) {
		template = template.replace(new RegExp(`\\$${k}`, 'g'), v);
	}
	return template;
}

// Load on startup
loadReplies();
