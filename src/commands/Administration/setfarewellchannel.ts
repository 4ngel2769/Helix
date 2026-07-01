import { ModuleCommand } from '@kbotdev/plugin-modules';
import { AdministrationModule } from '../../modules/Administration';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { Guild } from '../../models/Guild';

@ApplyOptions<Command.Options>({
  name: 'setfarewellchannel',
  description: 'Set the farewell message channel',
  preconditions: ['GuildOnly']
})
export class SetfarewellchannelCommand extends ModuleCommand<AdministrationModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Administration', description: 'Set the farewell message channel' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('setfarewellchannel')
        .setDescription('Set the farewell message channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption((option) =>
          option.setName('channel').setDescription('The farewell channel').setRequired(true)
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permission.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const channel = interaction.options.getChannel('channel', true);
      const value = channel.id;
      await Guild.updateOne(
        { guildId: interaction.guildId! },
        { $set: { 'farewellChannelId': value } },
        { upsert: true }
      );
      return interaction.editReply('Set the farewell message channel has been updated.');
    } catch (error) {
      this.container.logger.error('Error setting setfarewellchannel:', error);
      return interaction.editReply('An error occurred while updating the setting.');
    }
  }
}
