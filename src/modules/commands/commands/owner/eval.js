const Command = require('../../Command.js');
const { MessageEmbed } = require('discord.js');

module.exports = class EvalCommand extends Command {
    constructor(client) {
        super(client, {
            kind: client.kinds.OWNER,
            name: 'eval',
            usage: 'eval <code>',
            description: 'Executes the provided code and shows output.',
            ownerOnly: true,
            examples: ['eval 1 + 1']
        });
    }
    async run(message, args) {
    const input = args.join(' ');
    if (!input) return message.reply('No code to eval!\nPlease provide some code.');
    if(!input.toLowerCase().includes('token' || 'key')) {
        const embed = new MessageEmbed();

        try {
            let output = eval(input);
            if (typeof output !== 'string') output = require('util').inspect(output, { depth: 0 });
        
            embed
                .addField('Input', `\`\`\`js\n${input.length > 1024 ? 'Too large to display.' : input}\`\`\``)
                .addField('Output', `\`\`\`js\n${output.length > 1024 ? 'Too large to display.' : output}\`\`\``)
                .setColor('#66FF00');

        } catch(err) {
            embed
                .addField('Input', `\`\`\`js\n${input.length > 1024 ? 'Too large to display.' : input}\`\`\``)
                .addField('Output', `\`\`\`js\n${err.length > 1024 ? 'Too large to display.' : err}\`\`\``)
                .setColor('#FF0000');
        }

        message.reply({embeds: [embed]});

    } else {
        message.reply(':xmark:');
        }
    }
};