import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
    MessageFlags
} from 'discord.js';
import { startSinglePlayerGame, startMultiplayerGame } from './games/tictactoe';

@ApplyOptions<Command.Options>({
    enabled: true,
    nsfw: false,
    name: 'game',
    description: 'Play a game!',
    detailedDescription: 'Play various games like Tic Tac Toe.',
    fullCategory: ['Fun'],
    cooldownDelay: 5000,
    cooldownLimit: 3
})
export class GameCommand extends ModuleCommand<FunModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            description: 'Play a game!',
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
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('tictactoe')
                        .setDescription('Play Tic Tac Toe!')
                        .addUserOption((option) =>
                            option
                                .setName('user')
                                .setDescription('The user to play against (leave empty to play against the bot)')
                                .setRequired(false)
                        )
                )
        );
    }

    public override async chatInputRun(interaction: ModuleCommand.ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'tictactoe':
                return this.handleTicTacToe(interaction);
            default:
                return interaction.reply({ content: 'Unknown subcommand.', flags: MessageFlags.Ephemeral });
        }
    }

    private async handleTicTacToe(interaction: ModuleCommand.ChatInputCommandInteraction) {
        const opponent = interaction.options.getUser('user');
        if (!opponent) {
            const botUser = interaction.client.user!;
            return startSinglePlayerGame(interaction, interaction.user, botUser);
        }
        if (opponent.bot) {
            return interaction.reply({ content: 'You cannot play against a bot.', flags: MessageFlags.Ephemeral });
        }
        return startMultiplayerGame(interaction, interaction.user, opponent);
    }
}