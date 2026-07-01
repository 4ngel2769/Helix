import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'softban',
  description: 'Ban and immediately unban a user to clear their messages',
  preconditions: ['GuildOnly']
})
export class SoftbanCommand extends ModuleCommand<ModerationModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Moderation', description: 'Ban and immediately unban a user to clear their messages' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('softban')
        .setDescription('Ban and immediately unban a user to clear their messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption((o) => o.setName('user').setDescription('User to softban').setRequired(true))
        .addStringOption((o) => o.setName('reason').setDescription('Reason for softban'))
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ content: 'You need Ban Members permission.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'Softban';
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
    if (member && !member.bannable) return interaction.editReply('I cannot ban this user.');
    try {
      await interaction.guild!.bans.create(user.id, { reason, deleteMessageSeconds: 604800 });
      await interaction.guild!.bans.remove(user.id, 'Softban complete');
      return interaction.editReply(user.tag + ' has been softbanned.');
    } catch (error) {
      this.container.logger.error('Error softbanning user:', error);
      return interaction.editReply('Failed to softban user.');
    }
  }
}
