import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable, type GuildMember, type Message } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'permissions',
  description: 'Show a user\'s permissions',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class PermissionsCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Show a user\'s permissions', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const member = this.toGuildMember(interaction.options.getMember('user')) ?? this.toGuildMember(interaction.member);
      if (!member) return interaction.editReply('Member not found.');

      return interaction.editReply({ embeds: [this.buildPermissionsEmbed(member)] });
    } catch (error) {
      this.container.logger.error('Error in permissions:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: Message) {
    try {
      const member = message.mentions.members?.first() ?? message.member;
      if (!member) return message.reply('Member not found.');

      return message.reply({ embeds: [this.buildPermissionsEmbed(member)] });
    } catch (error) {
      this.container.logger.error('Error in permissions:', error);
      return message.reply('An error occurred.');
    }
  }

  private toGuildMember(member: unknown): GuildMember | null {
    if (!member || typeof member !== 'object') return null;
    return 'permissions' in member && 'user' in member ? (member as GuildMember) : null;
  }

  private buildPermissionsEmbed(member: GuildMember) {
    const permissions = member.permissions
      .toArray()
      .filter((permission) => !permission.startsWith('View') && !permission.startsWith('Read'));
    const midpoint = Math.ceil(permissions.length / 2);
    const firstColumn = permissions.length > 0 ? permissions.slice(0, midpoint).map((permission) => `\`${permission}\``).join('\n') : 'No permissions found';

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.default as ColorResolvable)
      .setTitle(`${member.user.tag}'s Permissions`)
      .setDescription(firstColumn);

    if (permissions.length > midpoint) {
      embed.addFields({
        name: '\u200b',
        value: permissions.slice(midpoint).map((permission) => `\`${permission}\``).join('\n'),
        inline: true
      });
    }

    return embed;
  }
}
