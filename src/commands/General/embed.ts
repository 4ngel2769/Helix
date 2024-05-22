import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
// import { EmbedBuilder } from 'discord.js';

@ApplyOptions<Command.Options>({
    name: 'embed',
    description: 'Embed command'
})
export class UserCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder//
                .setName(this.name)
                .setDescription(this.description)
                .addSubcommandGroup((builder) => 
                    builder //
                        .setName('group')
                        .setDescription('Group of commands')
                        .addSubcommand((builder) =>
                            builder //
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
    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        
    }
}
