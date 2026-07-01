import { ModuleCommand } from '@kbotdev/plugin-modules';
import { AdministrationModule } from '../../modules/Administration';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ChannelType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { Guild } from '../../models/Guild';

@ApplyOptions<Command.Options>({
  name: 'setrolelog',
  description: 'Set the role change log channel',
  preconditions: ['GuildOnly']
})
export class SetrolelogCommand extends ModuleCommand<AdministrationModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Administration', description: 'Set the role change log channel' });
  }
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName('setrolelog').setDescription('Set the role change log channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption((o) => o.setName('channel').setDescription('The channel for set the role change log channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
    );
  }
  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permission.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const channel = interaction.options.getChannel('channel', true);
      await Guild.updateOne(
        { guildId: interaction.guildId! },
        { $set: { 'roleLogChannelId': channel.id } },
        { upsert: true }
      );
      const reply = "Set the role change log channel set to " + channel + ".";
      return interaction.editReply(reply);
    } catch (error) {
      this.container.logger.error('Error setting setrolelog:', error);
      return interaction.editReply('An error occurred.');
    }
  }
}
