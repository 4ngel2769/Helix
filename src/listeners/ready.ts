import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { StoreRegistryValue } from '@sapphire/pieces';
import { blue, gray, green, magenta, magentaBright, white, yellow } from 'colorette';
import { ActivityType } from 'discord.js';
import { TPSMonitor } from '../lib/structures/TPSMonitor';

const dev = process.env.NODE_ENV !== 'production';

@ApplyOptions<Listener.Options>({ once: true })
export class UserEvent extends Listener {
	private readonly style = dev ? yellow : blue;

	public override run() {
		// this.botStartup();

		this.printBanner();
		this.printStoreDebugInformation();
		this.botStartupFinish();
		TPSMonitor.getInstance();
	}

	// Experimental

	// private botStartup() {
	// 	const { client } = this.container;

	// 	client.user?.setPresence({
	// 		status: 'dnd',
	// 		activities: [{name: 'Starting up...', type: ActivityType.Custom}]
	// 	})
	// }

	private printBanner() {
		const success = green('+');

		const llc = dev ? magentaBright : white;
		const blc = dev ? magenta : blue;

		const line01 = llc('');
		const line02 = llc('');
		const line03 = llc('');

		// Offset Pad
		const pad = ' '.repeat(7);

		console.log(
			String.raw`
				${line01} ${pad}${blc('10.0.0')}
				${line02} ${pad}[${success}] Gateway
				${line03}${dev ? ` ${pad}${blc('<')}${llc('/')}${blc('>')} ${llc('DEVELOPMENT MODE')}` : ''}
		`.trim()
		);
	}

	private printStoreDebugInformation() {
		const { client, logger } = this.container;
		const stores = [...client.stores.values()];
		const last = stores.pop()!;

		// Send current count of guilds in console
		this.container.logger.debug(`${this.container.client.user?.username} is in a total of ${this.container.client.guilds.cache.size} guilds with ${this.container.client.guilds.cache.reduce((a, b) => a + b.memberCount, 0)} members.`);

		for (const store of stores) logger.info(this.styleStore(store, false));
		logger.info(this.styleStore(last, true));
	}

	private styleStore(store: StoreRegistryValue, last: boolean) {
		return gray(`${last ? '└─' : '├─'} Loaded ${this.style(store.size.toString().padEnd(3, ' '))} ${store.name}.`);
	}
	
	private botStartupFinish() {
		const { client } = this.container;

		// Set status and presence things
		client.user?.setPresence({
			status: 'idle',
			activities: [{ name: 'Eating pizza', type: ActivityType.Custom}]
		})
	}
}
