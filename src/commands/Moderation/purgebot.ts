import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'purgebot',
  description: 'Bulk delete bot messages',
  preconditions: ['GuildOnly']
})
export class PurgebotCommand extends ModuleCommand<ModerationModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Moderation', description: 'Bulk delete bot messages' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('purgebot')
        .setDescription('Bulk delete bot messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption((o) => o.setName('amount').setDescription('Number of messages to check (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: 'You need Manage Messages permission.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const amount = interaction.options.getInteger('amount', true);
    const channel = interaction.channel!;
    if (!channel.isTextBased()) return interaction.editReply('This command can only be used in text channels.');
    try {
      const messages = await channel.messages.fetch({ limit: Math.min(amount, 100) });
      const botMessages = messages.filter(m => m.author.bot);
      const deleted = await (channel as any).bulkDelete(botMessages, true);
      return interaction.editReply('Deleted ' + deleted.size + ' bot messages.');
    } catch (error) {
      this.container.logger.error('Error purging bot messages:', error);
      return interaction.editReply('Failed to delete messages.');
    }
  }
}
