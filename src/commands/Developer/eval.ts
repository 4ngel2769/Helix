import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'eval',
  description: 'Evaluates JavaScript code',
  preconditions: ['OwnerOnly']
})
export class EvalCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {

		registry.registerChatInputCommand((builder) =>
		builder //
			.setName(this.name)
			.setDescription(this.description)
			.addStringOption((option) => 
				option //
					.setName('code')
					.setDescription('Code to evaluate')
					.setRequired(true)
			), {
                idHints: []
            }
		)
	}
    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        console.log('run');
        const code = interaction.options.getString('code', true);

        try {
            const result = eval(code);
            console.log(code);

            const embed = new EmbedBuilder()
                .setTitle('Eval Result')
                .setDescription(`\`\`\`js\n${result}\n\`\`\``)
                .setColor('#4CAF50');
            interaction.reply({ embeds: [embed] });
        } catch (error) {
            const embed = new EmbedBuilder()
                .setTitle('Eval Error')
                .setDescription(`\`\`\`js\n${error}\n\`\`\``)
                .setColor('#F44336');
            interaction.reply({ embeds: [embed] });
        }
    }
}
