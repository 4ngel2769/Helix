import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { AttachmentBuilder } from 'discord.js';
import axios from 'axios';
import config from '../../config';

@ApplyOptions<Command.Options>({
    name: 'getimg',
    description: 'Get a random image',
    fullCategory: ['Fun'],
    enabled: true,
    flags: true
})
export class GetImgCommand extends ModuleCommand<FunModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Fun',
            description: 'Get a random image',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setIntegrationTypes(0, 1)
                .setContexts(0, 1, 2)
                // .addStringOption((option) =>
                //     option
                //         .setName('category')
                //         .setDescription('Category of the image (e.g., nature, city, wildlife)')
                //         .setRequired(false)
                // )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const category = interaction.options.getString('category') || undefined;

        try {
            const imageBuffer = await this.fetchRandomImage(category);

            const attachment = new AttachmentBuilder(imageBuffer, { name: 'random_image.jpg' });

            return interaction.editReply({
                content: `Here is your random image${category ? ` from the "${category}" category` : ''}:`,
                files: [attachment]
            });
        } catch (error) {
            console.error('Error fetching random image:', error);
            return interaction.editReply({ content: 'Failed to fetch a random image. Please try again later.' });
        }
    }

    private async fetchRandomImage(category?: string): Promise<Buffer> {
        const url = 'https://api.api-ninjas.com/v1/randomimage';
        const headers = {
            'X-Api-Key': process.env.API_NINJAS_KEY || config.secrets.apiNinjas,
            Accept: 'image/jpg'
        };

        const params = category ? { category } : undefined;

        const response = await axios.get(url, {
            headers,
            params,
            responseType: 'arraybuffer'
        });

        if (response.status !== 200) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        return Buffer.from(response.data, 'binary');
    }
}