import { Subcommand } from '@kaname-png/plugin-subcommands-advanced';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework'; // Import Command from Sapphire Framework
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ComponentType,
    EmbedBuilder
} from 'discord.js';

@ApplyOptions<Subcommand.Options>({
    name: 'tictactoe',
    description: 'Play Tic Tac Toe!',
    fullCategory: ['Fun']
})
export class TicTacToeCommand extends Subcommand {
    private board: string[][] = [
        ['⬜', '⬜', '⬜'],
        ['⬜', '⬜', '⬜'],
        ['⬜', '⬜', '⬜']
    ];

    private currentPlayer = '❌';

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const embed = this.createGameEmbed();
        const components = this.createGameButtons();

        const message = await interaction.editReply({ embeds: [embed], components });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000 // 1 minute
        });

        collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
                return buttonInteraction.reply({ content: 'This is not your game!', ephemeral: true });
            }

            const [row, col] = buttonInteraction.customId.split('-').map(Number);

            if (this.board[row][col] !== '⬜') {
                return buttonInteraction.reply({ content: 'This spot is already taken!', ephemeral: true });
            }

            this.board[row][col] = this.currentPlayer;
            this.currentPlayer = this.currentPlayer === '❌' ? '⭕' : '❌';

            const winner = this.checkWinner();
            if (winner) {
                collector.stop();
                return interaction.editReply({
                    embeds: [this.createGameEmbed(`${winner} wins!`)],
                    components: []
                });
            }

            if (this.isBoardFull()) {
                collector.stop();
                return interaction.editReply({
                    embeds: [this.createGameEmbed('It\'s a draw!')],
                    components: []
                });
            }

            await buttonInteraction.update({
                embeds: [this.createGameEmbed()],
                components: this.createGameButtons()
            });
        });

        collector.on('end', () => {
            interaction.editReply({
                embeds: [this.createGameEmbed('Game over!')],
                components: []
            });
        });
    }

    private createGameEmbed(status = `It's ${this.currentPlayer}'s turn!`): EmbedBuilder {
        return new EmbedBuilder()
            .setTitle('Tic Tac Toe')
            .setDescription(this.board.map(row => row.join(' ')).join('\n'))
            .setFooter({ text: status });
    }

    private createGameButtons(): ActionRowBuilder<ButtonBuilder>[] {
        return this.board.map((row, rowIndex) =>
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                row.map((cell, colIndex) =>
                    new ButtonBuilder()
                        .setCustomId(`${rowIndex}-${colIndex}`)
                        .setLabel(cell === '⬜' ? ' ' : cell)
                        .setStyle(cell === '⬜' ? ButtonStyle.Secondary : ButtonStyle.Primary)
                        .setDisabled(cell !== '⬜')
                )
            )
        );
    }

    private checkWinner(): string | null {
        // Check rows and columns
        for (let i = 0; i < 3; i++) {
            if (this.board[i][0] !== '⬜' && this.board[i][0] === this.board[i][1] && this.board[i][1] === this.board[i][2]) {
                return this.board[i][0];
            }
            if (this.board[0][i] !== '⬜' && this.board[0][i] === this.board[1][i] && this.board[1][i] === this.board[2][i]) {
                return this.board[0][i];
            }
        }

        // Check diagonals
        if (this.board[0][0] !== '⬜' && this.board[0][0] === this.board[1][1] && this.board[1][1] === this.board[2][2]) {
            return this.board[0][0];
        }
        if (this.board[0][2] !== '⬜' && this.board[0][2] === this.board[1][1] && this.board[1][1] === this.board[2][0]) {
            return this.board[0][2];
        }

        return null;
    }

    private isBoardFull(): boolean {
        return this.board.every(row => row.every(cell => cell !== '⬜'));
    }
}