import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'unban',
  description: 'Unban a user',
  preconditions: ['GuildOnly']
})
export class UnbanCommand extends ModuleCommand<ModerationModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Moderation', description: 'Unban a user' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('unban')
        .setDescription('Unban a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption((o) => o.setName('user_id').setDescription('User ID to unban').setRequired(true))
        .addStringOption((o) => o.setName('reason').setDescription('Reason for unban'))
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: 'You need Ban Members permission.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const userId = interaction.options.getString('user_id', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    try {
      await interaction.guild!.bans.remove(userId, reason);
      return interaction.editReply('Unbanned user <@' + userId + '>.');
    } catch (error) {
      this.container.logger.error('Error unbanning user:', error);
      return interaction.editReply('Could not unban user. Check the ID is correct.');
    }
  }
}
