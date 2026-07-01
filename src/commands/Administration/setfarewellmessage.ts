import { ModuleCommand } from '@kbotdev/plugin-modules';
import { AdministrationModule } from '../../modules/Administration';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { Guild } from '../../models/Guild';

@ApplyOptions<Command.Options>({
  name: 'setfarewellmessage',
  description: 'Set the farewell message',
  preconditions: ['GuildOnly']
})
export class SetfarewellmessageCommand extends ModuleCommand<AdministrationModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Administration', description: 'Set the farewell message' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('setfarewellmessage')
        .setDescription('Set the farewell message')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption((option) =>
          option.setName('message').setDescription('The farewell message').setRequired(true)
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permission.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const message = interaction.options.getString('message', true);
      const value = message;
      await Guild.updateOne(
        { guildId: interaction.guildId! },
        { $set: { 'farewellMessage': value } },
        { upsert: true }
      );
      return interaction.editReply('Set the farewell message has been updated.');
    } catch (error) {
      this.container.logger.error('Error setting setfarewellmessage:', error);
      return interaction.editReply('An error occurred while updating the setting.');
    }
  }
}
