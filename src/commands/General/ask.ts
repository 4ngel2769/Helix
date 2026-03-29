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
	private readonly streamUpdateIntervalMs = 1500;

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

		if (!this.isModelAvailable(model)) {
			return interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor(config.bot.embedColor.err as ColorResolvable)
						.setTitle('Error')
						.setDescription(`Model "${model}" is not available.`)
				]
			});
		}

		await interaction.editReply({ embeds: [this.createResponseEmbed(interaction, model, '*Thinking...*')] });

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
			const stream = response.data as NodeJS.ReadableStream;

			let fullResponse = '';
			let lastUpdate = Date.now();

			stream.on('data', async (chunk: Buffer) => {
				const chunkText = this.extractResponseTextFromChunk(chunk);
				if (!chunkText) {
					return;
				}

				fullResponse += chunkText;
				const now = Date.now();
				if (now - lastUpdate <= this.streamUpdateIntervalMs) {
					return;
				}

				try {
					await interaction.editReply({
						embeds: [
							this.createResponseEmbed(interaction, model, this.formatResponseText(fullResponse, true))
						]
					});
					lastUpdate = now;
				} catch (updateError) {
					console.error('Error updating stream reply:', updateError);
				}
			});

			await new Promise<void>((resolve, reject) => {
				stream.on('end', () => resolve());
				stream.on('error', (streamError: Error) => reject(streamError));
			});

			return interaction.editReply({
				embeds: [this.createResponseEmbed(interaction, model, this.formatResponseText(fullResponse, false))]
			});
		} catch (error) {
			console.error('Ollama API error:', error);
			const errorMessage = this.getOllamaErrorMessage(error, model);

			const errorEmbed = new EmbedBuilder()
				.setColor(config.bot.embedColor.err as ColorResolvable)
				.setTitle('Error')
				.setDescription(errorMessage)
				.setFooter({ text: 'Try again later or contact the bot admin.' })
				.setTimestamp();

			return interaction.editReply({ embeds: [errorEmbed] });
		}
	}

	private isModelAvailable(model: string): boolean {
		return this.availableModels.includes(model as (typeof this.availableModels)[number]);
	}

	private createResponseEmbed(
		interaction: Command.ChatInputCommandInteraction,
		model: string,
		description: string
	): EmbedBuilder {
		return new EmbedBuilder()
			.setColor(config.bot.embedColor.default as ColorResolvable)
			.setAuthor({
				name: 'AI Response',
				iconURL: interaction.client.user?.displayAvatarURL()
			})
			.setDescription(description)
			.setFooter({ text: `Asked by ${interaction.user.username} • Model: ${model}` })
			.setTimestamp();
	}

	private formatResponseText(fullResponse: string, isStreaming: boolean): string {
		if (fullResponse.trim().length === 0) {
			return isStreaming ? '*Still thinking...*' : '*No response received.*';
		}

		const clamped = fullResponse.length > 4000 ? `${fullResponse.substring(0, 4000)}... (response truncated)` : fullResponse;
		return isStreaming && fullResponse.length <= 4000 ? `${clamped}▌` : clamped;
	}

	private extractResponseTextFromChunk(chunk: Buffer): string {
		let responseText = '';

		for (const line of chunk.toString().split('\n')) {
			const normalizedLine = line.trim();
			if (!normalizedLine) {
				continue;
			}

			try {
				const data = JSON.parse(normalizedLine) as { response?: unknown };
				if (typeof data.response === 'string') {
					responseText += data.response;
				}
			} catch (parseError) {
				console.error('Error parsing stream chunk:', parseError);
			}
		}

		return responseText;
	}

	private getOllamaErrorMessage(error: unknown, model: string): string {
		if (!axios.isAxiosError(error)) {
			return 'An error occurred while processing your request.';
		}

		if (error.code === 'ECONNREFUSED') {
			return 'Could not connect to the AI service.';
		}

		if (error.response?.status === 404) {
			return `Model '${model}' not found.`;
		}

		if (error.response) {
			return `Error ${error.response.status}: ${error.response.statusText}`;
		}

		return 'An error occurred while processing your request.';
	}
}
