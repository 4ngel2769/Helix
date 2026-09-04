// Loads the bot's canonical secrets file (repo src/.env) as a fallback.
// Precedence: real environment > dashboard/.env (auto-loaded by Bun) > src/.env.
// Must be imported before `./config` so the values are present when read.
import { fileURLToPath } from 'node:url';
import { setup } from '@skyra/env-utilities';

setup({ path: fileURLToPath(new URL('../../src/.env', import.meta.url)) });
