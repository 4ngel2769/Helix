import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { StoreRegistryValue } from '@sapphire/pieces';
import { blue, gray, green, magenta, magentaBright, white, yellow } from 'colorette';
import { ActivityType } from 'discord.js';
import { TPSMonitor } from '../lib/structures/TPSMonitor';
import { Guild } from '../models/Guild';
import { stripIndents } from 'common-tags';

const dev = process.env.NODE_ENV !== 'production';

@ApplyOptions<Listener.Options>({ once: true })
export class UserEvent extends Listener {
	private readonly style = dev ? yellow : blue;

	public override async run() {
		// this.botStartup();

		this.printBanner();
		this.printStoreDebugInformation();
		this.checkDatabaseStatus();
		this.syncGuildDatabase();
		this.botStartupFinish();
		
		// Initialize TPS Monitor
		TPSMonitor.getInstance();
		this.container.logger.info('TPS Monitor initialized');
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
		const line04 = llc('');
		const line05 = llc('');
		const line06 = llc('');

		// Offset Pad
		const pad = ' '.repeat(7);

		console.log(stripIndents`
 ██░ ██ ▓█████  ██▓     ██▓▒██   ██▒
▓██░ ██▒▓█   ▀ ▓██▒    ▓██▒▒▒ █ █ ▒░
▒██▀▀██░▒███   ▒██░    ▒██▒░░  █   ░
░▓█ ░██ ▒▓█  ▄ ▒██░    ░██░ ░ █ █ ▒ 
░▓█▒░██▓░▒████▒░██████▒░██░▒██▒ ▒██▒
 ▒ ░░▒░▒░░ ▒░ ░░ ▒░▓  ░░▓  ▒▒ ░ ░▓ ░
 ▒ ░▒░ ░ ░ ░  ░░ ░ ▒  ░ ▒ ░░░   ░▒ ░
 ░  ░░ ░   ░     ░ ░    ▒ ░ ░    ░  
 ░  ░  ░   ░  ░    ░  ░ ░   ░    ░  
                                    
			Created by angeldev0
${line01} ${pad}${blc('10.0.0')} ${llc(' - ')}${blc('Helix')} ${llc('by ')}${blc('Angel')}
${line02} ${pad}[${success}] Gateway
${line03}${dev ? ` ${pad}${blc('<')}${llc('/')}${blc('>')} ${llc('DEVELOPMENT MODE')}` : ''}
${line04} ${pad}[${success}] Database
${line05} ${pad}[${success}] TPS Monitor
${line06} ${pad}[${success}] Logger`);
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
			// Get all guilds the bot is in
			const guilds = client.guilds.cache;
			logger.info(`Starting guild database sync for ${guilds.size} guilds...`);
			
			let created = 0;
			let existing = 0;
			
			// Check each guild and create database entry if it doesn't exist
			for (const [guildId] of guilds) {
				const guildData = await Guild.findOne({ guildId });
				
				if (!guildData) {
					// Create default guild data
					const newGuild = new Guild({
						guildId,
						// Default module settings
						isGeneralModule: true,
						isModerationModule: true,
						isAdministrationModule: true,
						isFunModule: true,
						isWelcomingModule: false,
						isVerificationModule: false
					});
					
					await newGuild.save();
					created++;
				} else {
					existing++;
				}
			}
			
			logger.info(`Guild database sync complete: ${created} created, ${existing} existing`);
		} catch (error) {
			logger.error(`Error syncing guild database: ${error}`);
		}
	}
}
