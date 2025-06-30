import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
    ApplicationCommandType,
    type Message,
    MessageFlags,
    TextDisplayBuilder,
    SeparatorBuilder
} from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'test',
  description: 'Test command that replies with "tested"',
  preconditions: ['OwnerOnly']
})
export class TestCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        // Register slash command
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setIntegrationTypes(0,1)
                .setContexts(0,1,2)
        );

        // Register context menu command available from any message
        registry.registerContextMenuCommand({
            name: this.name,
            type: ApplicationCommandType.Message
        });

        // Register context menu command available from any user
        registry.registerContextMenuCommand({
            name: this.name,
            type: ApplicationCommandType.User
        });
    }

    // Message command
    public override async messageRun(message: Message) {
        return message.reply('tested');
    }

    // Slash command
    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const textComponent = new TextDisplayBuilder().setContent(
            'This is a text display component'
          );
      
          const separatorComponent = new SeparatorBuilder();
      
        return interaction.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [textComponent, separatorComponent, textComponent],
          });
    }

    // Context menu command
    public override async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
        return interaction.reply('tested');
    }
}
