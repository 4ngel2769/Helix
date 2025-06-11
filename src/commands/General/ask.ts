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
	// URL for Ollama API
	private readonly ollamaUrl = config.ollama.url;

	// Default model
	private readonly defaultModel = config.ollama.defaultModel;

	// Available models (could be expanded or made dynamic)
	private readonly availableModels = config.ollama.availableModels;

	// System prompt to give context to the AI
	private readonly systemPrompt = config.ollama.systemPrompt;

	public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
		super(context, {
			...options,
			description: 'Ask the AI a question',
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
				.addStringOption((option) => option.setName('prompt').setDescription('What would you like to ask the AI?').setRequired(true))
				.addStringOption((option) =>
					option
						.setName('model')
						.setDescription(`AI model to use (default: ${this.defaultModel})`)
						.setRequired(false)
						.setAutocomplete(true)
				)
		);
	}

	// Add this new method to handle autocomplete interactions
	public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
		const focusedOption = interaction.options.getFocused(true);

		if (focusedOption.name === 'model') {
			const input = focusedOption.value.toLowerCase();
			const filtered = this.availableModels.filter((model) => model.toLowerCase().includes(input));
            // Limit to 25 results
			return interaction.respond(
				filtered.slice(0, 25).map((model) => ({
					name: model,
					value: model
				}))
			);
		}

		return interaction.respond([]);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		// Defer reply to show "Bot is thinking..." and prevent timeout
		await interaction.deferReply();

		const prompt = interaction.options.getString('prompt', true);
		const model = interaction.options.getString('model') || this.defaultModel;
		const username = interaction.user.username;

		try {
			// Create the full prompt with system context
			const fullPrompt = `${this.systemPrompt}\n\n${username}: ${prompt}\n\nHelix:`;

			// Create an initial embed with loading indicator
			const embed = new EmbedBuilder()
				.setColor(config.bot.embedColor.default as ColorResolvable)
				.setAuthor({
					name: 'AI Response',
					iconURL: interaction.client.user?.displayAvatarURL()
				})
				.setDescription('*Thinking...*')
				.setFooter({
					text: `Asked by ${interaction.user.username} • Model: ${model}`
				})
				.setTimestamp();

			// Send the initial reply
			await interaction.editReply({
				embeds: [embed]
			});

			// Set up streaming with Ollama
			const response = await axios.post(
				this.ollamaUrl,
				{
					model: model,
					prompt: fullPrompt,
					stream: true
				},
				{
					responseType: 'stream'
				}
			);

			let fullResponse = '';
			let lastUpdate = Date.now();
			const UPDATE_INTERVAL = 1500; // Update every 1.5 seconds to avoid rate limits

			// Process the streaming response
			response.data.on('data', async (chunk: Buffer) => {
				try {
					const lines = chunk
						.toString()
						.split('\n')
						.filter((line) => line.trim());

					for (const line of lines) {
						if (!line) continue;

						const data = JSON.parse(line);
						if (data.response) {
							fullResponse += data.response;

							// Update the message periodically to avoid rate limits
							const now = Date.now();
							if (now - lastUpdate > UPDATE_INTERVAL) {
								const updatedEmbed = new EmbedBuilder()
									.setColor(config.bot.embedColor.default as ColorResolvable)
									.setAuthor({
										name: 'AI Response',
										iconURL: interaction.client.user?.displayAvatarURL()
									})
									.setDescription(
										fullResponse.length > 4000
											? fullResponse.substring(0, 4000) + '... (response will be truncated due to length)'
											: fullResponse + '▌'
									) // Add cursor to show it's still typing
									.setFooter({
										text: `Asked by ${interaction.user.username} • Model: ${model}`
									})
									.setTimestamp();

								await interaction.editReply({ embeds: [updatedEmbed] });
								lastUpdate = now;
							}
						}
					}
				} catch (err) {
					console.error('Error processing stream chunk:', err);
				}
			});

			// When the stream ends, send the final response
			return new Promise<void>((resolve, reject) => {
				response.data.on('end', async () => {
					try {
						// Clean up the response (remove any trailing "Helix:" or similar)
						fullResponse = fullResponse.replace(/^Helix:?\s*/i, '');

						const finalEmbed = new EmbedBuilder()
							.setColor(config.bot.embedColor.default as ColorResolvable)
							.setAuthor({
								name: 'AI Response',
								iconURL: interaction.client.user?.displayAvatarURL()
							})
							.setDescription(
								fullResponse.length > 4000 ? fullResponse.substring(0, 4000) + '... (response truncated due to length)' : fullResponse
							)
							.setFooter({
								text: `Asked by ${interaction.user.username} • Model: ${model}`
							})
							.setTimestamp();

						await interaction.editReply({ embeds: [finalEmbed] });
						resolve();
					} catch (error) {
						console.error('Error finalizing response:', error);
						reject(error);
					}
				});

				response.data.on('error', (error: Error) => {
					console.error('Stream error:', error);
					reject(error);
				});
			});
		} catch (error) {
			console.error('Error calling Ollama API:', error);

			let errorMessage = 'Sorry, I encountered an error while processing your request.';

			// Check for specific error types
			if (axios.isAxiosError(error)) {
				if (error.code === 'ECONNREFUSED') {
					errorMessage = 'Could not connect to the AI service. Please check check with the bot administrator.';
				} else if (error.response?.status === 404) {
					errorMessage = `Model '${model}' not found. Please try a different model.`;
				} else if (error.response) {
					errorMessage = `Error from AI service: ${error.response.status} ${error.response.statusText}`;
				}
			}

			// Create an error embed
			const errorEmbed = new EmbedBuilder()
				.setColor(config.bot.embedColor.err as ColorResolvable)
				.setTitle('Error')
				.setDescription(errorMessage)
				.setFooter({ text: 'Try again later or contact an administrator' })
				.setTimestamp();

			// Edit the deferred reply with the error embed
			return interaction.editReply({
				embeds: [errorEmbed]
			});
		}
	}
}
