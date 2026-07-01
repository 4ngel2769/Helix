import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { AttachmentBuilder, type Message } from 'discord.js';
import axios from 'axios';

@ApplyOptions<Command.Options>({
  name: 'rotate',
  description: 'Apply rotate filter to an avatar',
  
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class RotateCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'Apply rotate filter', enabled: true });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user', true);
    const avatar = user.displayAvatarURL({ size: 256, extension: 'png' });
    await interaction.deferReply();
    try {
      const res: any = await axios.get('https://some-random-api.com/canvas/rotate?avatar=' + avatar, { responseType: 'arraybuffer' });
      const attachment = new AttachmentBuilder(Buffer.from(res.data), { name: 'rotate.png' });
      return interaction.editReply({ files: [attachment] });
    } catch {
      return interaction.editReply({ content: 'Failed to process image.' });
    }
  }

  public override async messageRun(message: Message) {
    const target = message.mentions.users.first() || message.author;
    const avatar = target.displayAvatarURL({ size: 256, extension: 'png' });
    const reply = await message.reply('Processing...');
    try {
      const res: any = await axios.get('https://some-random-api.com/canvas/rotate?avatar=' + avatar, { responseType: 'arraybuffer' });
      const attachment = new AttachmentBuilder(Buffer.from(res.data), { name: 'rotate.png' });
      return reply.edit({ content: null, files: [attachment] });
    } catch {
      return reply.edit({ content: 'Failed to process image.' });
    }
  }
}
