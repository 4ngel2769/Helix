import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, ColorResolvable } from 'discord.js';
import axios from 'axios';
import config from '../../config';

// Interface for the API response structure
interface ElephantApiResponse {
	name: string;
	taxonomy: {
		scientific_name: string;
	};
	locations: string[];
	characteristics: {
		slogan: string;
		habitat: string;
		lifespan: string;
		weight: string;
		height: string;
	};
}

@ApplyOptions<Command.Options>({
	name: 'elephant',
	description: 'Get a random elephant fact and image',
	fullCategory: ['Fun'],
	enabled: true,
	flags: true
})
export class ElephantCommand extends ModuleCommand<FunModule> {
	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, {
			...options,
			module: 'Fun',
			description: 'Get a random elephant fact and image',
			enabled: true
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName(this.name).setDescription(this.description));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		await interaction.deferReply();

		try {
			const elephant = await this.fetchRandomElephant();

			const embed = new EmbedBuilder()
				.setColor(config.bot.embedColor.default as ColorResolvable)
				.setTitle(elephant.name)
				.setDescription(elephant.characteristics.slogan)
				.addFields(
					{ name: 'Scientific Name', value: elephant.taxonomy.scientific_name, inline: true },
					{ name: 'Habitat', value: elephant.characteristics.habitat, inline: true },
					{ name: 'Lifespan', value: elephant.characteristics.lifespan, inline: true },
					{ name: 'Weight', value: elephant.characteristics.weight, inline: true },
					{ name: 'Height', value: elephant.characteristics.height, inline: true },
					{ name: 'Locations', value: elephant.locations.join(', '), inline: false }
				)
				.setFooter({ text: 'Powered by 💚 API Ninjas' })
				.setTimestamp();

			return interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error('Error fetching elephant data:', error);
			return interaction.editReply({ content: 'Failed to fetch elephant data. Please try again later.' });
		}
	}

	private async fetchRandomElephant(): Promise<ElephantApiResponse> {
		const response = await axios.get<ElephantApiResponse[]>('https://api.api-ninjas.com/v1/animals?name=elephant', {
			headers: {
				'X-Api-Key': process.env.API_NINJAS_KEY || null
                //  || config.secrets.apiNinjas
			}
		});

		if (!response.data || response.data.length === 0) {
			throw new Error('No elephant data found.');
		}

		return response.data[Math.floor(Math.random() * response.data.length)];
	}
}
