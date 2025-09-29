import '@sapphire/framework';
import type { ModuleStore } from '@kbotdev/plugin-modules';

declare module '@sapphire/framework' {
	interface SapphireClient {
		modules: ModuleStore;
	}

	interface Container {
		client: SapphireClient;
	}
}
