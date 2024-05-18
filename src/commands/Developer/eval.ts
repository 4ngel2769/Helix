import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'eval',
  description: 'Evaluates JavaScript code'
})
export class EvalCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            enabled: true
        })
    }
    public override registerApplicationCommands(registry: Command.Registry) {

		registry.registerChatInputCommand((builder) =>
		builder //
			.setName(this.name)
			.setDescription(this.description)
			.addUserOption((option) => 
				option //
					.setName('code')
					.setDescription('User to fetch information about')
					.setRequired(true)
			)
		)
	}
    public async run(interaction: ModuleCommand.ChatInputCommandInteraction) {
        const code = interaction.options.getString('code', true);

        try {
        // Evaluate the code
        const result = eval(code);

        // Send the result as a message
        const embed = new EmbedBuilder()
        .setTitle('Eval Result')
        .setDescription(`\`\`\`js\n${result}\n\`\`\``)
        .setColor('#4CAF50');
        interaction.reply({ embeds: [embed] });
        } catch (error) {
        // Send the error as a message
        const embed = new EmbedBuilder()
        .setTitle('Eval Error')
        .setDescription(`\`\`\`js\n${error}\n\`\`\``)
        .setColor('#F44336');
        interaction.reply({ embeds: [embed] });
        }
    }
}