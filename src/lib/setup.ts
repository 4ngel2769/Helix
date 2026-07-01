// Unless explicitly defined, set NODE_ENV as development:
process.env.NODE_ENV ??= 'development';

const v8 = (process as typeof process & {
	getBuiltinModule?: (moduleName: string) => { startupSnapshot?: { isBuildingSnapshot?: () => boolean } };
}).getBuiltinModule?.('v8');

if (v8?.startupSnapshot?.isBuildingSnapshot) {
	try {
		v8.startupSnapshot.isBuildingSnapshot();
	} catch (error) {
		const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: string }).code : undefined;
		if (code === 'ERR_NOT_IMPLEMENTED') {
			v8.startupSnapshot.isBuildingSnapshot = () => false;
		} else {
			throw error;
		}
	}
}

import { ApplicationCommandRegistries, RegisterBehavior } from '@sapphire/framework';
import '@sapphire/plugin-api/register';
import '@sapphire/plugin-editable-commands/register';
import '@sapphire/plugin-logger/register';
import '@kbotdev/plugin-modules/register';
import '@sapphire/plugin-subcommands/register';
import '@sapphire/plugin-hmr/register';
import '@kaname-png/plugin-subcommands-advanced/register';
import { setup, type ArrayString } from '@skyra/env-utilities';
import * as colorette from 'colorette';
import { join } from 'path';
import { inspect } from 'util';
import { srcDir } from './constants';

// Set default behavior to bulk overwrite
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

// Read env var
setup({ path: join(srcDir, '.env') });

// Set default inspection depth
inspect.defaultOptions.depth = 1;

// Enable colorette
colorette.createColors({ useColor: true });

declare module '@skyra/env-utilities' {
	interface Env {
		OWNERS: ArrayString;
	}
}
