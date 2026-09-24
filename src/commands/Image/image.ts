import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { AttachmentBuilder, MessageFlags } from 'discord.js';
import axios from 'axios';
import { HybridModuleCommand } from '../../lib/structures/HybridCommand';
import { commandHelpEmbed } from '../../lib/utils/commandHelp';

const filters = [
  'beautiful',
  'blur',
  'brightness',
  'contrast',
  'delete',
  'flip',
  'greyscale',
  'invert',
  'jpeg',
  'jail',
  'pixelate',
  'rainbow',
  'rotate',
  'sepia',
  'sharpen',
  'threshold',
  'triggered',
  'wanted',
  'wasted'
] as const;

@ApplyOptions<Command.Options>({
  name: 'image',
  description: 'Apply an image filter to an avatar',
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class ImageCommand extends HybridModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, {
      ...options,
      module: 'Fun',
      description: 'Apply an image filter to an avatar',
      enabled: true
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) => {
      const command = builder
        .setName(this.name)
        .setDescription(this.description)
        .setIntegrationTypes(0, 1)
        .setContexts(0, 1, 2);

      for (const filter of filters) {
        command.addSubcommand((subcommand) =>
          subcommand
            .setName(filter)
            .setDescription(`Apply ${filter} filter to an avatar`)
            .addUserOption((option) =>
              option
                .setName('user')
                .setDescription('The user whose avatar to process')
                .setRequired(false)
            )
        );
      }

      command.addSubcommand((subcommand) => subcommand.setName('help').setDescription('Show the image filter options and usage'));
      return command;
    });
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'help') {
      return interaction.reply({
        embeds: [commandHelpEmbed(this, 'Apply image filters to a user avatar.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const user = interaction.options.getUser('user') ?? interaction.user;
    const avatar = user.displayAvatarURL({ size: 256, extension: 'png' });
    const endpoint = subcommand === 'rainbow' ? 'gay' : subcommand;

    await interaction.deferReply();
    try {
      const res: any = await axios.get(`https://some-random-api.com/canvas/${endpoint}?avatar=${avatar}`, {
        responseType: 'arraybuffer'
      });
      const attachment = new AttachmentBuilder(Buffer.from(res.data), { name: `${subcommand}.png` });
      return interaction.editReply({ files: [attachment] });
    } catch {
      return interaction.editReply({ content: 'Failed to process image.' });
    }
  }
}
