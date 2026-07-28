import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, type ColorResolvable, type GuildMember, type Message, type User } from 'discord.js';
import config from '../../../config';

@ApplyOptions<Command.Options>({
  name: 'yeet',
  description: 'Show a fun user profile display',
  
  fullCategory: ['General'],
  enabled: true,
  flags: true
})
export class YeetCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Show a fun user profile display', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const user = interaction.options.getUser('user') || interaction.user;
      const member = interaction.guild?.members.cache.get(user.id);

      return interaction.editReply({ embeds: [this.buildYeetEmbed(user, member)] });
    } catch (error) {
      this.container.logger.error('Error in yeet:', error);
      return interaction.editReply({ content: 'An error occurred.' });
    }
  }

  public override async messageRun(message: Message) {
    try {
      const user = message.mentions.users.first() || message.author;
      const member = message.guild?.members.cache.get(user.id);

      return message.reply({ embeds: [this.buildYeetEmbed(user, member)] });
    } catch (error) {
      this.container.logger.error('Error in yeet:', error);
      return message.reply('An error occurred.');
    }
  }

  private buildYeetEmbed(user: User, member?: GuildMember) {
    const joinedAt = member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown';
    const roleCount = member ? member.roles.cache.size.toString() : '0';

    return new EmbedBuilder()
      .setColor(config.bot.embedColor.magic as ColorResolvable)
      .setTitle('YEET!')
      .setDescription(`${user.tag} has been yeeted!`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: 'Joined', value: joinedAt, inline: true },
        { name: 'Roles', value: roleCount, inline: true }
      );
  }
}
