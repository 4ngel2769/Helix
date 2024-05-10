import './lib/setup';

import { LogLevel, SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits, Partials } from 'discord.js';
import { env } from 'process';
// import Keyv from 'keyv';

// import SoftUI  from 'dbd-soft-ui';
// import config from '../config.json';

// let DBD = require('discord-dashboard');

const client = new SapphireClient({
	defaultPrefix: env.PREFIX,
	regexPrefix: /^(hey +)?bot[,! ]/i,
	caseInsensitiveCommands: false,
	logger: {
		level: LogLevel.Debug
	},
	shards: 'auto',
	intents: [
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildEmojisAndStickers,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent
	],
	partials: [Partials.Channel],
	loadMessageCommandListeners: true
});

// const Handler = new DBD.Handler(
// );

// (async ()=>{
//     await DBD.useLicense(config.dashboard.license);
//     DBD.Dashboard = DBD.UpdatedClass();

//     const Dashboard = new DBD.Dashboard({
//         port: config.dashboard.port,
//         client: config.bot.client,
//         redirectUri: `${config.dashboard.domain}${config.dashboard.redirectUri}`,
//         domain: config.dashboard.domain,
//         ownerIDs: config.dashboard.ownerIDs,
//         useThemeMaintenance: true,
//         useTheme404: true,
//         bot: client,
// 		acceptPrivacyPolicy: true,
//         theme: SoftUI({
//             storage: Handler,
//             customThemeOptions: {
//                 index: async ({ }) => {
//                     return {
//                         values: [],
//                         graph: {},
//                         cards: [],
//                     }
//                 },
//             },
//             websiteName: "Helix",
//             colorScheme: "blue",
//             supporteMail: config.dashboard.supportMail,
//             icons: {
// 				backgroundImage: '',
//                 favicon: '../src/db/assets/branding/helix.png',
//                 noGuildIcon: '../src/db/assets/branding/logo.png',
//                 sidebar: {
//                     darkUrl: config.dashboard.ui.darkLogo,
//                     lightUrl: config.dashboard.ui.lightLogo,
//                     hideName: false,
//                     borderRadius: false,
//                     alignCenter: true
//                 },
//             },
//             index: {
//                 graph: {
//                     enabled: true,
//                     lineGraph: true,
//                     title: 'Memory Usage',
//                     tag: 'Memory (MB)',
//                     max: 300
//                 },
//             },
//             sweetalert: {
//                 errors: {},
//                 success: {
//                     login: "Successfully logged in.",
//                 }
//             },
//             preloader: {
//                 image: config.dashboard.ui.preload,
//                 spinner: false,
//                 text: "welcome...",
//             },
//             admin: {
//                 pterodactyl: {
//                     enabled: false,
//                     apiKey: "apiKey",
//                     panelLink: "https://panel.website.com",
//                     serverUUIDs: []
//                 }
//             },
//             commands: [],
//         }),
//         settings: []
//     });
//     Dashboard.init();
// })();

const main = async () => {
	try {
		client.logger.info('Logging in');
		await client.login();
		client.logger.info('logged in');
	} catch (error) {
		client.logger.fatal(error);
		await client.destroy();
		process.exit(1);
	}
};

void main();
