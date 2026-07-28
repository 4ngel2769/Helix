import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable, type Collection, type Message, type Role, type Snowflake } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'roleinfo',
  description: 'Show role information',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class RoleinfoCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Show role information', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const roleQuery = interaction.options.getString('role');
      if (!roleQuery) return interaction.editReply('Usage: roleinfo <role name/ID>');

      const role = this.findRole(interaction.guild?.roles.cache, roleQuery);
      if (!role) return interaction.editReply('Role not found.');

      return interaction.editReply({ embeds: [this.buildRoleEmbed(role)] });
    } catch (error) {
      this.container.logger.error('Error in roleinfo:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: Message) {
    try {
      const roleQuery = message.content.split(/\s+/).slice(1).join(' ');
      if (!roleQuery) return message.reply('Usage: roleinfo <role name/ID>');

      const role = this.findRole(message.guild?.roles.cache, roleQuery);
      if (!role) return message.reply('Role not found.');

      return message.reply({ embeds: [this.buildRoleEmbed(role)] });
    } catch (error) {
      this.container.logger.error('Error in roleinfo:', error);
      return message.reply('An error occurred.');
    }
  }

  private findRole(roleCache: Collection<Snowflake, Role> | undefined, query: string): Role | undefined {
    if (!roleCache) return undefined;

    const loweredQuery = query.toLowerCase();
    return roleCache.find((role) => role.name === query || role.id === query || role.name.toLowerCase().includes(loweredQuery));
  }

  private buildRoleEmbed(role: Role) {
    return new EmbedBuilder()
      .setColor((role.color || config.bot.embedColor.default) as ColorResolvable)
      .setTitle(`Role Info: ${role.name}`)
      .addFields(
        { name: 'ID', value: role.id, inline: true },
        { name: 'Color', value: role.hexColor, inline: true },
        { name: 'Position', value: role.position.toString(), inline: true },
        { name: 'Members', value: role.members.size.toString(), inline: true },
        { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
        { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
        { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true }
      );
  }
}
