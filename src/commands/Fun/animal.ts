import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags, type ColorResolvable } from 'discord.js';
import config from '../../config';
import { HybridModuleCommand } from '../../lib/structures/HybridCommand';

type RedditSource = 'some-random-api' | 'memedroid';

type RedditAnimal = {
	animal: string;
	endpoint: string;
	source: RedditSource;
};

type RedditResponse = {
	image?: string;
	url?: string;
	fact?: string;
};

type PetsResponse = Array<{
	url?: string;
}>;

const redditAnimals: readonly RedditAnimal[] = [
	{ animal: 'bird', endpoint: 'https://some-random-api.com/animal/bird', source: 'some-random-api' },
	{ animal: 'cat', endpoint: 'https://some-random-api.com/animal/cat', source: 'some-random-api' },
	{ animal: 'capybara', endpoint: 'https://api.memedroid.io/animals/random/capybara', source: 'memedroid' },
	{ animal: 'dog', endpoint: 'https://some-random-api.com/animal/dog', source: 'some-random-api' },
	{ animal: 'duck', endpoint: 'https://some-random-api.com/animal/duck', source: 'some-random-api' },
	{ animal: 'fox', endpoint: 'https://some-random-api.com/animal/fox', source: 'some-random-api' },
	{ animal: 'frog', endpoint: 'https://some-random-api.com/animal/frog', source: 'some-random-api' },
	{ animal: 'koala', endpoint: 'https://some-random-api.com/animal/koala', source: 'some-random-api' },
	{ animal: 'lizard', endpoint: 'https://some-random-api.com/animal/lizard', source: 'some-random-api' },
	{ animal: 'panda', endpoint: 'https://some-random-api.com/animal/panda', source: 'some-random-api' },
	{ animal: 'rabbit', endpoint: 'https://api.memedroid.io/animals/random/rabbit', source: 'memedroid' },
	{ animal: 'raccoon', endpoint: 'https://some-random-api.com/animal/raccoon', source: 'some-random-api' },
	{ animal: 'redpanda', endpoint: 'https://api.memedroid.io/animals/random/redpanda', source: 'memedroid' },
	{ animal: 'snake', endpoint: 'https://some-random-api.com/animal/snake', source: 'some-random-api' }
];

const petAnimals = ['birb', 'bunny', 'doggo', 'ferret', 'hamster', 'hedgehog', 'kitty', 'otter', 'penguin', 'pet', 'pupper', 'squirrel'] as const;

@ApplyOptions<Command.Options>({
	name: 'animal',
	description: 'Get a random animal image',
	fullCategory: ['Fun'],
	enabled: true,
	flags: true
})
export class AnimalCommand extends HybridModuleCommand<FunModule> {
	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, {
			...options,
			module: 'Fun',
			description: 'Get a random animal image',
			enabled: true
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => {
			const root = builder.setName(this.name).setDescription(this.description);
			// NOTE: `addSubcommandGroup` returns the PARENT, not the group, and the
			// callback must RETURN the group. Add subcommands to the builder handed in.
			root.addSubcommandGroup((reddit) => {
				reddit.setName('reddit').setDescription('Get random animal images');
				for (const animal of redditAnimals) {
					reddit.addSubcommand((subcommand) => subcommand.setName(animal.animal).setDescription(`Get a random ${animal.animal} image`));
				}
				return reddit;
			});
			root.addSubcommandGroup((pets) => {
				pets.setName('pets').setDescription('Get random pet images');
				for (const animal of petAnimals) {
					pets.addSubcommand((subcommand) => subcommand.setName(animal).setDescription(`Get a random ${animal} image`));
				}
				return pets;
			});
			root.addSubcommand((subcommand) => subcommand.setName('help').setDescription('Show the animal command help'));
		});
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const group = interaction.options.getSubcommandGroup(false);
		const subcommand = interaction.options.getSubcommand();
		if (group === null && subcommand === 'help') {
			return interaction.reply({ embeds: [this.createHelpEmbed()], flags: MessageFlags.Ephemeral });
		}

		await interaction.deferReply();
		if (group === 'reddit') {
			return this.runReddit(interaction, subcommand);
		}
		if (group === 'pets') {
			return this.runPet(interaction, subcommand);
		}
		return interaction.editReply({ content: 'Invalid animal command.' });
	}

	private async runReddit(interaction: Command.ChatInputCommandInteraction, name: string) {
		const animal = redditAnimals.find((entry) => entry.animal === name);
		if (!animal) {
			return interaction.editReply({ content: 'Invalid reddit animal.' });
		}
		try {
			const response = await fetch(animal.endpoint);
			const data = (await response.json()) as RedditResponse;
			const embed = new EmbedBuilder()
				.setColor(config.bot.embedColor.default as ColorResolvable)
				.setTitle(`Random ${animal.animal}`)
				.setImage((animal.source === 'memedroid' ? data.url || data.image : data.image) ?? null)
				.setFooter({ text: data.fact || '' });
			return interaction.editReply({ embeds: [embed] });
		} catch {
			return interaction.editReply({ content: `Failed to fetch ${animal.animal} image.` });
		}
	}

	private async runPet(interaction: Command.ChatInputCommandInteraction, name: string) {
		const animal = petAnimals.find((entry) => entry === name);
		if (!animal) {
			return interaction.editReply({ content: 'Invalid pet animal.' });
		}
		try {
			const response = await fetch('https://api.thedogapi.com/v1/images/search?limit=1');
			const data = (await response.json()) as PetsResponse;
			const embed = new EmbedBuilder()
				.setColor(config.bot.embedColor.default as ColorResolvable)
				.setTitle(`Random ${animal[0].toUpperCase()}${animal.slice(1)}`)
				.setImage(data[0]?.url ?? null);
			return interaction.editReply({ embeds: [embed] });
		} catch {
			return interaction.editReply({ content: `Failed to fetch ${animal} image.` });
		}
	}

	private createHelpEmbed(): EmbedBuilder {
		return new EmbedBuilder()
			.setColor(config.bot.embedColor.default as ColorResolvable)
			.setTitle('/animal command help')
			.setDescription('Get a random animal image from an animal image API.')
			.addFields(
				{
					name: '/animal reddit',
					value: redditAnimals.map((animal) => `\`${animal.animal}\``).join(', ')
				},
				{
					name: '/animal pets',
					value: petAnimals.map((animal) => `\`${animal}\``).join(', ')
				},
				{
					name: '/animal help',
					value: 'Show this help message.'
				}
			);
	}
}
