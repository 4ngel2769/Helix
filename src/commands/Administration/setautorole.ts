import { ModuleCommand } from '@kbotdev/plugin-modules';
import { AdministrationModule } from '../../modules/Administration';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { Guild } from '../../models/Guild';

@ApplyOptions<Command.Options>({
  name: 'setautorole',
  description: 'Set the auto-assign role for new members',
  preconditions: ['GuildOnly']
})
export class SetautoroleCommand extends ModuleCommand<AdministrationModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Administration', description: 'Set the auto-assign role for new members' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('setautorole')
        .setDescription('Set the auto-assign role for new members')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption((option) =>
          option.setName('role').setDescription('The role to auto-assign').setRequired(true)
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permission.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const role = interaction.options.getRole('role', true);
      const value = role;
      await Guild.updateOne(
        { guildId: interaction.guildId! },
        { $set: { 'autoroleId': value } },
        { upsert: true }
      );
      return interaction.editReply('Set the auto-assign role for new members has been updated.');
    } catch (error) {
      this.container.logger.error('Error setting setautorole:', error);
      return interaction.editReply('An error occurred while updating the setting.');
    }
  }
}
