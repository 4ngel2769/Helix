import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { Script, createContext } from 'node:vm';
import { inspect } from 'node:util';

const MAX_CODE_LENGTH = 800;
const EXECUTION_TIMEOUT_MS = 1000;
const OUTPUT_LIMIT = 3500;

const BLOCKED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
	{ pattern: /\bprocess\b/i, reason: 'Access to process is blocked.' },
	{ pattern: /\brequire\b/i, reason: 'Module loading is blocked.' },
	{ pattern: /\bimport\b/i, reason: 'Imports are blocked.' },
	{ pattern: /\bchild_process\b/i, reason: 'Process spawning is blocked.' },
	{ pattern: /\bfs\b/i, reason: 'File system access is blocked.' },
	{ pattern: /\bmodule\b/i, reason: 'Module access is blocked.' },
	{ pattern: /\bglobal\b/i, reason: 'Global object access is blocked.' }
];

@ApplyOptions<Command.Options>({
	name: 'eval',
	description: 'Evaluates JavaScript code',
	preconditions: ['OwnerOnly']
})
export class EvalCommand extends Command {
	private createEmbed(title: string, color: string, content: string) {
		return new EmbedBuilder().setTitle(title).setDescription(`\`\`\`js\n${content}\n\`\`\``).setColor(color);
	}

	private toDisplay(value: unknown): string {
		if (typeof value === 'string') return value;
		return inspect(value, { depth: 2, maxArrayLength: 25, breakLength: 100 });
	}

	private trimOutput(value: string): string {
		if (value.length <= OUTPUT_LIMIT) return value;
		return `${value.slice(0, OUTPUT_LIMIT)}\n...output truncated`;
	}

	private getBlockedReason(code: string): string | null {
		const match = BLOCKED_PATTERNS.find(({ pattern }) => pattern.test(code));
		return match?.reason ?? null;
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder
					.setName(this.name)
					.setDescription(this.description)
					.addStringOption((option) =>
						option
							.setName('code')
							.setDescription('Code to evaluate')
							.setRequired(true)
					),
			{
				idHints: []
			}
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const code = interaction.options.getString('code', true);
		if (code.length > MAX_CODE_LENGTH) {
			const embed = this.createEmbed('Eval Rejected', '#F44336', `Input exceeds ${MAX_CODE_LENGTH} characters.`);
			return interaction.reply({ embeds: [embed], ephemeral: true });
		}

		const blockedReason = this.getBlockedReason(code);
		if (blockedReason) {
			const embed = this.createEmbed('Eval Rejected', '#F44336', blockedReason);
			return interaction.reply({ embeds: [embed], ephemeral: true });
		}

		try {
			const logs: string[] = [];
			const sandbox = {
				Math,
				Date,
				JSON,
				Number,
				String,
				Boolean,
				Array,
				Object,
				RegExp,
				Map,
				Set,
				Promise,
				console: {
					log: (...args: unknown[]) => logs.push(args.map((arg) => this.toDisplay(arg)).join(' '))
				}
			};

			const wrappedCode = `(async () => {\n${code}\n})()`;
			const script = new Script(wrappedCode);
			const context = createContext(sandbox);
			const result = await script.runInContext(context, {
				timeout: EXECUTION_TIMEOUT_MS,
				displayErrors: true
			});

			const outputParts = [
				`Result: ${this.toDisplay(result)}`,
				...(logs.length ? [`Logs:\n${logs.join('\n')}`] : [])
			];
			const output = this.trimOutput(outputParts.join('\n\n'));

			const embed = this.createEmbed('Eval Result', '#4CAF50', output);
			return interaction.reply({ embeds: [embed], ephemeral: true });
		} catch (error) {
			const output = this.trimOutput(this.toDisplay(error));
			const embed = this.createEmbed('Eval Error', '#F44336', output);
			return interaction.reply({ embeds: [embed], ephemeral: true });
		}
	}
}
