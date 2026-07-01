import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'purge',
  description: 'Bulk delete messages',
  preconditions: ['GuildOnly']
})
export class PurgeCommand extends ModuleCommand<ModerationModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Moderation', description: 'Bulk delete messages' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('purge')
        .setDescription('Bulk delete messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption((o) => o.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .addUserOption((o) => o.setName('user').setDescription('Only delete messages from this user'))
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: 'You need Manage Messages permission.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const amount = interaction.options.getInteger('amount', true);
    const targetUser = interaction.options.getUser('user');
    const channel = interaction.channel!;
    if (!channel.isTextBased()) return interaction.editReply('This command can only be used in text channels.');
    try {
      const messages = await channel.messages.fetch({ limit: Math.min(amount, 100) });
      const toDelete = targetUser ? messages.filter(m => m.author.id === targetUser.id) : messages;
      const deleted = await (channel as any).bulkDelete(toDelete, true);
      return interaction.editReply('Deleted ' + deleted.size + ' messages.');
    } catch (error) {
      this.container.logger.error('Error purging messages:', error);
      return interaction.editReply('Failed to delete messages. Messages may be too old.');
    }
  }
}
