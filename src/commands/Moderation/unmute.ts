import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'unmute',
  description: 'Remove a timeout from a user',
  preconditions: ['GuildOnly']
})
export class UnmuteCommand extends ModuleCommand<ModerationModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Moderation', description: 'Remove a timeout from a user' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('unmute')
        .setDescription('Remove a timeout from a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption((o) => o.setName('user').setDescription('The user to remove timeout from').setRequired(true))
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: 'You need Moderate Members permission.', flags: MessageFlags.Ephemeral });
    }
    const user = interaction.options.getUser('user', true);
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'User not found.', flags: MessageFlags.Ephemeral });
    if (!member.communicationDisabledUntil) return interaction.reply({ content: 'User is not timed out.', flags: MessageFlags.Ephemeral });
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await member.timeout(null);
      return interaction.editReply(user.tag + ' has been unmuted.');
    } catch (error) {
      this.container.logger.error('Error unmuting user:', error);
      return interaction.editReply('Failed to unmute user.');
    }
  }
}
