"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framework_1 = require("@sapphire/framework");
const discord_js_1 = require("discord.js");
const client = new framework_1.SapphireClient({
    intents: [discord_js_1.GatewayIntentBits.MessageContent, discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildMessages],
    loadMessageCommandListeners: true
});
