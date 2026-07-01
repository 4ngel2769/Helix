import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'setnickname',
  description: "Change a user's nickname",
  preconditions: ['GuildOnly']
})
export class SetnicknameCommand extends ModuleCommand<ModerationModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Moderation', description: "Change a user's nickname" });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('setnickname')
        .setDescription("Change a user's nickname")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
        .addUserOption((o) => o.setName('user').setDescription('The user').setRequired(true))
        .addStringOption((o) => o.setName('nickname').setDescription('New nickname').setRequired(true))
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageNicknames)) {
      return interaction.reply({ content: 'You need Manage Nicknames permission.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user = interaction.options.getUser('user', true);
    const nickname = interaction.options.getString('nickname', true);
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.editReply('User not found.');
    if (!member.manageable) return interaction.editReply("I cannot change this user's nickname.");
    try {
      await member.setNickname(nickname);
      return interaction.editReply("Changed " + user.tag + "'s nickname to " + nickname + ".");
    } catch (error) {
      this.container.logger.error('Error setting nickname:', error);
      return interaction.editReply('Failed to set nickname.');
    }
  }
}
