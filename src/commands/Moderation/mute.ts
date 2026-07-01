import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'mute',
  description: 'Timeout a user',
  preconditions: ['GuildOnly']
})
export class MuteCommand extends ModuleCommand<ModerationModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Moderation', description: 'Timeout a user' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('mute')
        .setDescription('Timeout a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption((o) => o.setName('user').setDescription('The user to timeout').setRequired(true))
        .addIntegerOption((o) => o.setName('duration').setDescription('Duration in minutes').setRequired(true))
        .addStringOption((o) => o.setName('reason').setDescription('Reason for the timeout'))
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: 'You need Moderate Members permission.', flags: MessageFlags.Ephemeral });
    }
    const user = interaction.options.getUser('user', true);
    const duration = interaction.options.getInteger('duration', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'User not found in this server.', flags: MessageFlags.Ephemeral });
    if (!member.moderatable) return interaction.reply({ content: 'I cannot timeout this user.', flags: MessageFlags.Ephemeral });
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await member.timeout(duration * 60 * 1000, reason);
      return interaction.editReply(user.tag + ' has been timed out for ' + duration + ' minutes.');
    } catch (error) {
      this.container.logger.error('Error timing out user:', error);
      return interaction.editReply('Failed to timeout user.');
    }
  }
}
