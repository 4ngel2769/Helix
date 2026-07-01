import { ModuleCommand } from '@kbotdev/plugin-modules';
import { AdministrationModule } from '../../modules/Administration';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { Guild } from '../../models/Guild';

@ApplyOptions<Command.Options>({
  name: 'setwelcomemessage',
  description: 'Set the welcome message',
  preconditions: ['GuildOnly']
})
export class SetwelcomemessageCommand extends ModuleCommand<AdministrationModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Administration', description: 'Set the welcome message' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('setwelcomemessage')
        .setDescription('Set the welcome message')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption((option) =>
          option.setName('message').setDescription('The welcome message (use {user} for mention)').setRequired(true)
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
        { $set: { 'welcomeMessage': value } },
        { upsert: true }
      );
      return interaction.editReply('Set the welcome message has been updated.');
    } catch (error) {
      this.container.logger.error('Error setting setwelcomemessage:', error);
      return interaction.editReply('An error occurred while updating the setting.');
    }
  }
}
