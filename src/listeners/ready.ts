// Import from packages
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { StoreRegistryValue } from '@sapphire/pieces';
import { stripIndents } from 'common-tags';
import {
	blue,
	blueBright, 
	gray,
	green,
	redBright, 
	white,
	yellow
} from 'colorette';
import { ActivityType } from 'discord.js';

// Import from files
import { Guild } from '../models/Guild';
import config from '../config.js';

const dev = process.env.NODE_ENV !== 'production';

@ApplyOptions<Listener.Options>({ event: 'clientReady', once: true })
export class UserEvent extends Listener {
	private readonly style = dev ? yellow : blue;

	public override async run() {
		// this.botStartup();

		this.printBanner();
		this.printStoreDebugInformation();
		this.applyGlobalCommandGuard();
		this.checkDatabaseStatus();
		this.syncGuildDatabase();
		this.botStartupFinish();
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
		const { logger } = this.container;
		const success = green('+');

		const llc = dev ? blueBright : white;
		const blc = dev ? blue : blue;
		const ylc = dev ? yellow : yellow;
		const rlc = dev ? redBright : redBright;

		const banner = stripIndents`
		| ██░ ██ ▓█████  ██▓     ██▓▒██   ██▒
		|▓██░ ██▒▓█   ▀ ▓██▒    ▓██▒▒▒ █ █ ▒░
		|▒██▀▀██░▒███   ▒██░    ▒██▒░░  █   ░
		|░▓█ ░██ ▒▓█  ▄ ▒██░    ░██░ ░ █ █ ▒ 
		|░▓█▒░██▓░▒████▒░██████▒░██░▒██▒ ▒██▒
		| ▒ ░░▒░▒░░ ▒░ ░░ ▒░▓  ░░▓  ▒▒ ░ ░▓ ░
		| ▒ ░▒░ ░ ░ ░  ░░ ░ ▒  ░ ▒ ░░░   ░▒ ░
		| ░  ░░ ░   ░     ░ ░    ▒ ░ ░    ░  
		| ░  ░  ░   ░  ░    ░  ░ ░   ░    ░  
		`;

		this.container.logger.info(banner);
        logger.info(`[${success}] Performance Monitor initialized and tracking started`);
        
        if (dev) logger.warn(`${blc('<')}${llc('/')}${blc('>')} ${llc('DEVELOPMENT MODE')}`);
		logger.info(`${ylc(`Helix version ${config.bot.version}`)}${llc(' - ')}${llc('by ')}${rlc('\u001B]8;;https://github.com/4ngel2769/Helix\u0007angeldev0\u001B]8;;\u0007')}`);
        logger.info(`[${success}] Gateway: ${blc(this.container.client.ws.shards.size.toString())} shards`);
        logger.info(`[${success}] Database`);
        logger.info(`[${success}] Performance Monitor`);
        logger.info(`[${success}] Logger`);
	}

	private applyGlobalCommandGuard() {
		// Enforce per-guild `disabledCommands` (dashboard + /togglecommand) for every
		// command without editing each command file. The precondition itself is a
		// no-op for DMs and critical commands; failures here must never crash boot.
		try {
			const store = this.container.stores.get('commands');
			let count = 0;
			for (const command of store.values()) {
				const preconditions = (command as unknown as { preconditions?: { append?: (entry: unknown) => void } }).preconditions;
				if (preconditions && typeof preconditions.append === 'function') {
					preconditions.append({ name: 'GuildCommandEnabled' });
					count += 1;
				}
			}
			this.container.logger.info(`Applied GuildCommandEnabled guard to ${count} commands`);
		} catch (error) {
			this.container.logger.warn('Failed to apply global GuildCommandEnabled guard:', error);
		}
	}

	private printStoreDebugInformation() {		const { client, logger } = this.container;
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
	
	private checkDatabaseStatus() {
		const { database, logger } = this.container;
		
		if (database?.isConnected) {
			logger.info(`Connected to MongoDB with ${database.collections.length} collections`);
		} else {
			logger.warn('Not connected to MongoDB. Some features may not work properly.');
		}
	}

	private async syncGuildDatabase() {
		const { client, logger, database } = this.container;
		
		// Skip if database is not connected
		if (!database?.isConnected) {
			logger.warn('Skipping guild database sync due to no database connection');
			return;
		}
		
		try {
			const guildIds = client.guilds.cache.map(g => g.id);
			logger.info(`Starting guild database sync for ${guildIds.length} guilds...`);
			
			const existing = await Guild.find({ guildId: { $in: guildIds } }, { guildId: 1 });
			const existingIds = new Set(existing.map(g => g.guildId));
			const toCreate = guildIds.filter(id => !existingIds.has(id));
			
			if (toCreate.length > 0) {
				await Guild.insertMany(toCreate.map(guildId => ({ guildId })));
			}
			
			logger.info(`Guild database sync complete: ${toCreate.length} created, ${existingIds.size} existing`);
		} catch (error) {
			logger.error(`Error syncing guild database: ${error}`);
		}
	}
}
