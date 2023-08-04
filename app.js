const Discord = require('.src/helixmod.js');
const client = new Discord.Client({disableMentions: "all"})

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message');

client.login(config.token)
