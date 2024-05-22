import { Subcommand } from '@sapphire/plugin-subcommands';
// import { EmbedBuilder } from 'discord.js';

export class EmbedCommand extends Subcommand {
    public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
        super(context, {
            ...options,
            name: 'embed',
            description: 'embed stuff',
            subcommands: [
                { name: 'embedsubcommand', chatInputRun: 'embedChatInput'},
                {
                    name: 'embedGroup',
                    type: 'group',
                    entries: [
                        { name: 'send', chatInputRun: 'embedSubSend' },
                        { name: 'remove', chatInputRun: 'embedSubRemove' }
                    ]
                }
            ]
        });
    }

    public override registerApplicationCommands(registry: Subcommand.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder//
                .setName(this.name)
                .setDescription(this.description)
                .addSubcommandGroup((group) => 
                    group //
                        .setName('group')
                        .setDescription('Group of commands')
                        .addSubcommand((command) =>
                            command //
                                .setName('subcommand')
                                .setDescription('Subcommand')
                                .addStringOption((option) =>
                                    option //
                                        .setName('string')
                                        .setDescription('String option')
                                        .setRequired(true)
                    )
                )
            )
        )
    }

    public async embedChatInput(interaction: Subcommand.ChatInputCommandInteraction) {
        interaction.reply('bro');
    }
}
