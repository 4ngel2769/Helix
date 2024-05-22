import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';


@ApplyOptions<Command.Options>({
    name: 'embed',
    description: 'Embed command'
})
export class UserCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand({
            name: this.name,
            description: this.description
        });
    }
}