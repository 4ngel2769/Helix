import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, ColorResolvable } from 'discord.js';
import axios from 'axios';
import config from '../../config';

@ApplyOptions<Command.Options>({
	enabled: true,
	name: 'ask',
	description: 'Ask the AI a question',
	detailedDescription: 'Ask Ollama AI a question and get a response',
	fullCategory: ['General'],
	cooldownDelay: 5000,
	cooldownLimit: 1
})
export class AskCommand extends ModuleCommand<GeneralModule> {
	private readonly ollamaUrl = config.ollama.url;
	private readonly defaultModel = config.ollama.defaultModel;
	private readonly availableModels = config.ollama.availableModels;
	private readonly systemPrompt = config.ollama.systemPrompt;

	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, { ...options });
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setIntegrationTypes(0, 1)
				.setContexts(0, 1, 2)
				.addStringOption((option) => option.setName('prompt').setDescription('What would you like to ask the AI?').setRequired(true))
				.addStringOption((option) =>
					option.setName('model').setDescription(`AI model to use (default: ${this.defaultModel})`).setRequired(false).setAutocomplete(true)
				)
		);
	}

	public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
		const focusedOption = interaction.options.getFocused(true);
		if (focusedOption.name === 'model') {
			const input = focusedOption.value.toLowerCase();
			const filtered = this.availableModels.filter((model) => model.toLowerCase().includes(input));
			return interaction.respond(filtered.slice(0, 25).map((model) => ({ name: model, value: model })));
		}
		return interaction.respond([]);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		await interaction.deferReply();

		const userPrompt = interaction.options.getString('prompt', true);
		const model = interaction.options.getString('model') || this.defaultModel;

		if (!this.availableModels.includes(model as (typeof this.availableModels)[number])) {
			return interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor(config.bot.embedColor.err as ColorResolvable)
						.setTitle('Error')
						.setDescription(`Model "${model}" is not available.`)
				]
			});
		}

		const embed = new EmbedBuilder()
			.setColor(config.bot.embedColor.default as ColorResolvable)
			.setAuthor({
				name: 'AI Response',
				iconURL: interaction.client.user?.displayAvatarURL()
			})
			.setDescription('*Thinking...*')
			.setFooter({ text: `Asked by ${interaction.user.username} • Model: ${model}` })
			.setTimestamp();

		await interaction.editReply({ embeds: [embed] });

		try {
			const response = await axios.post(
				this.ollamaUrl,
				{
					model,
					prompt: userPrompt,
					system: this.systemPrompt,
					stream: true
				},
				{ responseType: 'stream' }
			);

			let fullResponse = '';
			let lastUpdate = Date.now();
			const UPDATE_INTERVAL = 1500;

			response.data.on('data', async (chunk: Buffer) => {
				try {
					const lines = chunk
						.toString()
						.split('\n')
						.filter((line) => line.trim());

					for (const line of lines) {
						if (!line) continue;

						// Parse the JSON response
						const data = JSON.parse(line);

						// Fixed: Look for response key instead of message.content
						if (data.response) {
							fullResponse += data.response;

							const now = Date.now();
							if (now - lastUpdate > UPDATE_INTERVAL) {
								const updatedEmbed = new EmbedBuilder()
									.setColor(config.bot.embedColor.default as ColorResolvable)
									.setAuthor({
										name: 'AI Response',
										iconURL: interaction.client.user?.displayAvatarURL()
									})
									.setDescription(
										fullResponse.trim().length > 0
											? fullResponse.length > 4000
												? fullResponse.substring(0, 4000) + '... (response truncated)'
												: fullResponse + '▌' // Add cursor to show typing
											: '*Still thinking...*'
									)
									.setFooter({ text: `Asked by ${interaction.user.username} • Model: ${model}` })
									.setTimestamp();

								await interaction.editReply({ embeds: [updatedEmbed] });
								lastUpdate = now;
							}
						}
					}
				} catch (err) {
					console.error('Error parsing stream chunk:', err);
				}
			});

			return new Promise<void>((resolve, reject) => {
				response.data.on('end', async () => {
					try {
						const finalText =
							fullResponse.trim().length > 0
								? fullResponse.length > 4000
									? fullResponse.substring(0, 4000) + '... (response truncated)'
									: fullResponse
								: '*No response received.*';

						const finalEmbed = new EmbedBuilder()
							.setColor(config.bot.embedColor.default as ColorResolvable)
							.setAuthor({
								name: 'AI Response',
								iconURL: interaction.client.user?.displayAvatarURL()
							})
							.setDescription(finalText)
							.setFooter({ text: `Asked by ${interaction.user.username} • Model: ${model}` })
							.setTimestamp();

						await interaction.editReply({ embeds: [finalEmbed] });
						resolve();
					} catch (error) {
						console.error('Error finalizing stream:', error);
						reject(error);
					}
				});

				response.data.on('error', (error: Error) => {
					console.error('Stream error:', error);
					reject(error);
				});
			});
		} catch (error) {
			console.error('Ollama API error:', error);

			let errorMessage = 'An error occurred while processing your request.';
			if (axios.isAxiosError(error)) {
				if (error.code === 'ECONNREFUSED') {
					errorMessage = 'Could not connect to the AI service.';
				} else if (error.response?.status === 404) {
					errorMessage = `Model '${model}' not found.`;
				} else if (error.response) {
					errorMessage = `Error ${error.response.status}: ${error.response.statusText}`;
				}
			}

			const errorEmbed = new EmbedBuilder()
				.setColor(config.bot.embedColor.err as ColorResolvable)
				.setTitle('Error')
				.setDescription(errorMessage)
				.setFooter({ text: 'Try again later or contact the bot admin.' })
				.setTimestamp();

			return interaction.editReply({ embeds: [errorEmbed] });
		}
	}
}
