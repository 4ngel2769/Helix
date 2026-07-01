import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ChannelType, MessageFlags, PermissionFlagsBits } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'slowmode',
  description: 'Set channel slowmode',
  preconditions: ['GuildOnly']
})
export class SlowmodeCommand extends ModuleCommand<ModerationModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Moderation', description: 'Set channel slowmode' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('slowmode')
        .setDescription('Set channel slowmode')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addIntegerOption((o) => o.setName('seconds').setDescription('Slowmode in seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600))
        .addChannelOption((o) => o.setName('channel').setDescription('Target channel').addChannelTypes(ChannelType.GuildText))
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: 'You need Manage Channels permission.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const seconds = interaction.options.getInteger('seconds', true);
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    if (!channel || !channel && 'setRateLimitPerUser' in channel) return interaction.editReply('Invalid channel.');
    try {
      await (channel as any).setRateLimitPerUser(seconds);
      return interaction.editReply(seconds > 0 ? 'Slowmode set to ' + seconds + 's in ' + channel + '.' : 'Slowmode disabled in ' + channel + '.');
    } catch (error) {
      this.container.logger.error('Error setting slowmode:', error);
      return interaction.editReply('Failed to set slowmode.');
    }
  }
}
